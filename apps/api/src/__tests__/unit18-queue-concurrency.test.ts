import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { seed } from "../seeds/seed.js";
import {
  IncidentLogAction,
  IncidentStatus,
  IncidentUrgency,
} from "@incident-pulse/shared";
import { escalationService } from "../services/escalation.service.js";
import { escalationDlq, escalationQueue } from "../lib/queue.js";

const app = createApp();

describe("Unit 18: Queue Reliability, Concurrency & State Machine Integrity", () => {
  let adminToken: string;
  let responderToken: string;
  let testServiceId: string;

  before(async () => {
    await seed();

    const adminRes = await request(app).post("/api/v1/auth/login").send({
      email: "admin@incidentpulse.io",
      password: "AdminPassword123!",
    });
    assert.equal(adminRes.status, 200);
    adminToken = adminRes.body.token;

    const responderRes = await request(app).post("/api/v1/auth/login").send({
      email: "sarah.chen@incidentpulse.io",
      password: "ResponderPassword123!",
    });
    assert.equal(responderRes.status, 200);
    responderToken = responderRes.body.token;

    const service = await prisma.service.findFirstOrThrow();
    testServiceId = service.id;
  });

  describe("1. Concurrency: Simultaneous Acknowledge Race Mitigation", () => {
    it("handles 5 concurrent acknowledge requests atomically without duplicate logs", async () => {
      // 1. Create a fresh triggered incident
      const inc = await prisma.incident.create({
        data: {
          title: "Concurrent Race Test - Cache Saturation",
          status: IncidentStatus.TRIGGERED,
          urgency: IncidentUrgency.HIGH,
          serviceId: testServiceId,
          fingerprint: `test:race:ack:${Date.now()}`,
          escalationStep: 1,
          logs: {
            create: {
              action: IncidentLogAction.TRIGGERED,
              message: "Test incident for concurrent ACK race condition",
            },
          },
        },
      });

      // 2. Fire 5 simultaneous acknowledge requests from multiple workers/clients
      const responses = await Promise.all([
        request(app)
          .post(`/api/v1/incidents/${inc.id}/acknowledge`)
          .set("Authorization", `Bearer ${responderToken}`)
          .send({ note: "Worker A acknowledging" }),
        request(app)
          .post(`/api/v1/incidents/${inc.id}/acknowledge`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ note: "Worker B acknowledging" }),
        request(app)
          .post(`/api/v1/incidents/${inc.id}/acknowledge`)
          .set("Authorization", `Bearer ${responderToken}`)
          .send({ note: "Worker C acknowledging" }),
        request(app)
          .post(`/api/v1/incidents/${inc.id}/acknowledge`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ note: "Worker D acknowledging" }),
        request(app)
          .post(`/api/v1/incidents/${inc.id}/acknowledge`)
          .set("Authorization", `Bearer ${responderToken}`)
          .send({ note: "Worker E acknowledging" }),
      ]);

      // All requests should succeed with 200 without throwing 500 deadlock
      for (const res of responses) {
        assert.equal(res.status, 200);
        assert.equal(res.body.incident.status, IncidentStatus.ACKNOWLEDGED);
      }

      // Query database directly to verify exactly 1 ACKNOWLEDGED log exists
      const directLogs = await prisma.incidentLog.findMany({
        where: {
          incidentId: inc.id,
          action: IncidentLogAction.ACKNOWLEDGED,
        },
      });

      assert.equal(
        directLogs.length,
        1,
        `Expected exactly 1 ACKNOWLEDGED log entry, found ${directLogs.length}`,
      );
    });
  });

  describe("2. Concurrency: Simultaneous Resolve Race Mitigation", () => {
    it("handles 5 concurrent resolve requests atomically without duplicate logs", async () => {
      const inc = await prisma.incident.create({
        data: {
          title: "Concurrent Race Test - Worker Resolution",
          status: IncidentStatus.ACKNOWLEDGED,
          urgency: IncidentUrgency.HIGH,
          serviceId: testServiceId,
          fingerprint: `test:race:resolve:${Date.now()}`,
          escalationStep: 1,
          logs: {
            create: {
              action: IncidentLogAction.TRIGGERED,
              message: "Test incident for concurrent resolve race condition",
            },
          },
        },
      });

      const responses = await Promise.all([
        request(app)
          .post(`/api/v1/incidents/${inc.id}/resolve`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ resolutionNotes: "Admin resolved" }),
        request(app)
          .post(`/api/v1/incidents/${inc.id}/resolve`)
          .set("Authorization", `Bearer ${responderToken}`)
          .send({ resolutionNotes: "Responder resolved" }),
        request(app)
          .post(`/api/v1/incidents/${inc.id}/resolve`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ resolutionNotes: "Admin resolved again" }),
        request(app)
          .post(`/api/v1/incidents/${inc.id}/resolve`)
          .set("Authorization", `Bearer ${responderToken}`)
          .send({ resolutionNotes: "Responder resolved again" }),
        request(app)
          .post(`/api/v1/incidents/${inc.id}/resolve`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ resolutionNotes: "Final resolver" }),
      ]);

      for (const res of responses) {
        assert.equal(res.status, 200);
        assert.equal(res.body.incident.status, IncidentStatus.RESOLVED);
      }

      const directLogs = await prisma.incidentLog.findMany({
        where: {
          incidentId: inc.id,
          action: IncidentLogAction.RESOLVED,
        },
      });

      assert.equal(
        directLogs.length,
        1,
        `Expected exactly 1 RESOLVED log entry, found ${directLogs.length}`,
      );
    });
  });

  describe("3. Escalation State Machine Concurrency & Transition Guards", () => {
    it("aborts auto-escalation step if incident was already ACKNOWLEDGED", async () => {
      const inc = await prisma.incident.create({
        data: {
          title: "Escalation Guard Test - Already Acked",
          status: IncidentStatus.ACKNOWLEDGED,
          urgency: IncidentUrgency.HIGH,
          serviceId: testServiceId,
          fingerprint: `test:guard:acked:${Date.now()}`,
          escalationStep: 1,
          acknowledgedAt: new Date(),
        },
      });

      // Try executing escalation step 2
      await escalationService.executeEscalationStep(inc.id, 2);

      // Verify incident remains at Step 1 and not progressed
      const fresh = await prisma.incident.findUniqueOrThrow({
        where: { id: inc.id },
      });
      assert.equal(fresh.escalationStep, 1);

      // Verify no ESCALATED log was added
      const logs = await prisma.incidentLog.findMany({
        where: { incidentId: inc.id, action: IncidentLogAction.ESCALATED },
      });
      assert.equal(logs.length, 0);
    });

    it("aborts auto-escalation step if incident was already RESOLVED", async () => {
      const inc = await prisma.incident.create({
        data: {
          title: "Escalation Guard Test - Already Resolved",
          status: IncidentStatus.RESOLVED,
          urgency: IncidentUrgency.HIGH,
          serviceId: testServiceId,
          fingerprint: `test:guard:resolved:${Date.now()}`,
          escalationStep: 1,
          resolvedAt: new Date(),
        },
      });

      await escalationService.executeEscalationStep(inc.id, 2);

      const fresh = await prisma.incident.findUniqueOrThrow({
        where: { id: inc.id },
      });
      assert.equal(fresh.escalationStep, 1);

      const logs = await prisma.incidentLog.findMany({
        where: { incidentId: inc.id, action: IncidentLogAction.ESCALATED },
      });
      assert.equal(logs.length, 0);
    });

    it("aborts auto-escalation step if step number is less than or equal to current step", async () => {
      const inc = await prisma.incident.create({
        data: {
          title: "Escalation Guard Test - Out of Order",
          status: IncidentStatus.TRIGGERED,
          urgency: IncidentUrgency.HIGH,
          serviceId: testServiceId,
          fingerprint: `test:guard:duplicate_step:${Date.now()}`,
          escalationStep: 2,
        },
      });

      // Try executing step 2 or step 1 again
      await escalationService.executeEscalationStep(inc.id, 2);

      const fresh = await prisma.incident.findUniqueOrThrow({
        where: { id: inc.id },
      });
      assert.equal(fresh.escalationStep, 2);
    });
  });

  describe("4. BullMQ Retry Backoff & Dead Letter Queue (DLQ)", () => {
    it("configures escalation queue with exponential backoff and attempt limits", async () => {
      const defaultOpts = escalationQueue.defaultJobOptions;
      assert.equal(defaultOpts?.attempts, 5);
      assert.equal(typeof defaultOpts?.backoff, "object");
      assert.equal(
        (defaultOpts?.backoff as { type: string })?.type,
        "exponential",
      );
      assert.equal((defaultOpts?.backoff as { delay: number })?.delay, 2000);
    });

    it("persists unrecoverable failed jobs in Dead Letter Queue", async () => {
      const testJobId = `test_dlq_${Date.now()}`;
      await escalationDlq.add(
        "failed_escalation",
        {
          incidentId: "test-dlq-incident-id",
          nextStepNumber: 3,
          failedReason: "Service uncontactable after 5 attempts",
          failedAt: new Date().toISOString(),
          attemptsMade: 5,
        },
        { jobId: testJobId },
      );

      const dlqJob = await escalationDlq.getJob(testJobId);
      assert.ok(dlqJob, "Job should be retrievable from DLQ");
      assert.equal(
        dlqJob.data.failedReason,
        "Service uncontactable after 5 attempts",
      );
      assert.equal(dlqJob.data.attemptsMade, 5);

      // Clean up test job
      await dlqJob.remove();
    });
  });
});
