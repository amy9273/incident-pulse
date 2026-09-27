import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import request from "supertest";
import express from "express";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { seed } from "../seeds/seed.js";
import {
  IncidentLogAction,
  IncidentStatus,
  IncidentUrgency,
  UserRole,
} from "@incident-pulse/shared";
import { escalationService } from "../services/escalation.service.js";
import {
  escalationQueue,
  createEscalationWorker,
} from "../workers/escalation.worker.js";

describe("BullMQ Escalation State Machine Worker (Unit 05)", () => {
  let app: express.Express;
  let adminToken: string;
  let responderToken: string;
  let worker: ReturnType<typeof createEscalationWorker>;

  before(async () => {
    await seed();
    app = createApp();
    worker = createEscalationWorker();

    // Login Admin
    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: "admin@incidentpulse.io",
      password: "AdminPassword123!",
    });
    adminToken = adminLogin.body.token;

    // Login Responder
    const responderLogin = await request(app).post("/api/v1/auth/login").send({
      email: "sarah.chen@incidentpulse.io",
      password: "ResponderPassword123!",
    });
    responderToken = responderLogin.body.token;
  });

  after(async () => {
    await worker.close();
    await escalationQueue.close();
  });

  describe("Incident Triage Endpoints", () => {
    let testIncidentId: string;

    before(async () => {
      // Create a test incident
      const service = await prisma.service.findFirstOrThrow();
      const inc = await prisma.incident.create({
        data: {
          title: "API Gateway High Latency",
          status: IncidentStatus.TRIGGERED,
          urgency: IncidentUrgency.HIGH,
          serviceId: service.id,
          fingerprint: `test:escalation:${Date.now()}`,
          escalationStep: 1,
          logs: {
            create: {
              action: IncidentLogAction.TRIGGERED,
              message: "Test incident triggered",
            },
          },
        },
      });
      testIncidentId = inc.id;
    });

    it("GET /api/v1/incidents lists all incidents with pagination", async () => {
      const res = await request(app)
        .get("/api/v1/incidents?limit=10&offset=0")
        .set("Authorization", `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.incidents));
      assert.ok(res.body.total >= 1);
      assert.strictEqual(res.body.limit, 10);
    });

    it("GET /api/v1/incidents/:id returns incident with full audit logs", async () => {
      const res = await request(app)
        .get(`/api/v1/incidents/${testIncidentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.incident.id, testIncidentId);
      assert.ok(Array.isArray(res.body.incident.logs));
      assert.ok(res.body.incident.logs.length >= 1);
    });

    it("GET /api/v1/incidents/:id returns 404 for non-existent ID", async () => {
      const res = await request(app)
        .get("/api/v1/incidents/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 404);
    });

    it("POST /api/v1/incidents/:id/acknowledge transitions status to ACKNOWLEDGED", async () => {
      const res = await request(app)
        .post(`/api/v1/incidents/${testIncidentId}/acknowledge`)
        .set("Authorization", `Bearer ${responderToken}`)
        .send({ note: "Investigating backend latency" });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.incident.status, IncidentStatus.ACKNOWLEDGED);
      assert.ok(res.body.incident.acknowledgedAt);

      // Verify audit log
      const logs = res.body.incident.logs;
      const ackLog = logs.find(
        (l: { action: string }) => l.action === IncidentLogAction.ACKNOWLEDGED,
      );
      assert.ok(ackLog, "Must have ACKNOWLEDGED audit log entry");
      assert.ok(ackLog.message.includes("Investigating backend latency"));
    });

    it("POST /api/v1/incidents/:id/resolve transitions status to RESOLVED", async () => {
      const res = await request(app)
        .post(`/api/v1/incidents/${testIncidentId}/resolve`)
        .set("Authorization", `Bearer ${responderToken}`)
        .send({ resolutionNotes: "Restarted stalled ingress pod" });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.incident.status, IncidentStatus.RESOLVED);
      assert.ok(res.body.incident.resolvedAt);

      // Verify audit log
      const logs = res.body.incident.logs;
      const resLog = logs.find(
        (l: { action: string }) => l.action === IncidentLogAction.RESOLVED,
      );
      assert.ok(resLog, "Must have RESOLVED audit log entry");
      assert.ok(resLog.message.includes("Restarted stalled ingress pod"));
    });

    it("POST /api/v1/incidents/:id/acknowledge rejects already RESOLVED incidents (409)", async () => {
      const res = await request(app)
        .post(`/api/v1/incidents/${testIncidentId}/acknowledge`)
        .set("Authorization", `Bearer ${responderToken}`);

      assert.strictEqual(res.status, 409);
      assert.strictEqual(
        res.body.error.message,
        "Cannot acknowledge an already resolved incident",
      );
    });
  });

  describe("Escalation Target & State Machine Logic", () => {
    it("resolves target user from on-call Schedule shift", async () => {
      const schedule = await prisma.schedule.findFirstOrThrow();
      const user = await escalationService.resolveTarget({
        targetType: "SCHEDULE",
        targetScheduleId: schedule.id,
      });

      assert.ok(user, "Must resolve an on-call engineer from schedule");
      assert.strictEqual(user.role, UserRole.RESPONDER);
    });

    it("advances escalationStep and logs auto-escalation when unacknowledged", async () => {
      const service = await prisma.service.findFirstOrThrow({
        include: { escalationPolicy: { include: { rules: true } } },
      });

      const inc = await prisma.incident.create({
        data: {
          title: "Unacknowledged Critical Memory Leak",
          status: IncidentStatus.TRIGGERED,
          urgency: IncidentUrgency.HIGH,
          serviceId: service.id,
          fingerprint: `test:auto-escalate:${Date.now()}`,
          escalationStep: 1,
          logs: {
            create: {
              action: IncidentLogAction.TRIGGERED,
              message: "Initial trigger",
            },
          },
        },
      });

      // Execute Step 2 escalation directly
      await escalationService.executeEscalationStep(inc.id, 2);

      const escalatedInc = await prisma.incident.findUniqueOrThrow({
        where: { id: inc.id },
        include: { logs: { orderBy: { createdAt: "asc" } } },
      });

      assert.strictEqual(escalatedInc.escalationStep, 2);
      assert.strictEqual(escalatedInc.status, IncidentStatus.TRIGGERED);
      assert.strictEqual(escalatedInc.logs.length, 2);
      assert.strictEqual(
        escalatedInc.logs[1]?.action,
        IncidentLogAction.ESCALATED,
      );
      assert.ok(escalatedInc.logs[1]?.message.includes("Tier 2"));
    });

    it("skips escalation execution if incident was acknowledged", async () => {
      const service = await prisma.service.findFirstOrThrow();
      const inc = await prisma.incident.create({
        data: {
          title: "Acknowledged Fast Incident",
          status: IncidentStatus.ACKNOWLEDGED,
          urgency: IncidentUrgency.HIGH,
          serviceId: service.id,
          fingerprint: `test:skip-ack:${Date.now()}`,
          escalationStep: 1,
        },
      });

      // Attempt to execute step 2 on acknowledged incident
      await escalationService.executeEscalationStep(inc.id, 2);

      const unchanged = await prisma.incident.findUniqueOrThrow({
        where: { id: inc.id },
      });
      assert.strictEqual(unchanged.escalationStep, 1);
      assert.strictEqual(unchanged.status, IncidentStatus.ACKNOWLEDGED);
    });

    it("schedules and cancels BullMQ delayed jobs cleanly (Invariant #1)", async () => {
      const testId = "00000000-0000-0000-0000-000000000001";
      const jobId = `escalation_${testId}_step_2`;

      try {
        await escalationService.scheduleEscalationStep(testId, 2, 60000);

        // Verify job in queue
        const job = await escalationQueue.getJob(jobId);
        assert.ok(job, `Job ${jobId} must exist in BullMQ delayed queue`);
        assert.strictEqual(job?.data?.incidentId, testId);

        // Cancel job
        await escalationService.cancelEscalation(testId);
        const afterCancelJob = await escalationQueue.getJob(jobId);
        assert.ok(
          !afterCancelJob,
          "Job must be removed after cancelEscalation",
        );
      } catch (err) {
        console.error("DEBUG TEST ERROR:", err);
        throw err;
      }
    });
  });
});
