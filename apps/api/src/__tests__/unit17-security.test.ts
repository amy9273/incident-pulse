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
import { resetRateLimits } from "../middlewares/rate-limit.middleware.js";

const app = createApp();

describe("Unit 17: Security Hardening, RBAC Guards & Secret Protection", () => {
  let adminToken: string;
  let responderToken: string;
  let viewerToken: string;
  let testIncidentId: string;
  let testScheduleId: string;
  let testShiftId: string | undefined;
  let testServiceId: string;
  let plaintextServiceKey: string;

  before(async () => {
    await seed();
    resetRateLimits();

    // 1. Authenticate Admin
    const adminRes = await request(app).post("/api/v1/auth/login").send({
      email: "admin@incidentpulse.io",
      password: "AdminPassword123!",
    });
    assert.equal(adminRes.status, 200);
    adminToken = adminRes.body.token;

    // 2. Authenticate Responder
    const responderRes = await request(app).post("/api/v1/auth/login").send({
      email: "sarah.chen@incidentpulse.io",
      password: "ResponderPassword123!",
    });
    assert.equal(responderRes.status, 200);
    responderToken = responderRes.body.token;

    // 3. Authenticate Viewer
    const viewerRes = await request(app).post("/api/v1/auth/login").send({
      email: "viewer@incidentpulse.io",
      password: "Password123!",
    });
    assert.equal(viewerRes.status, 200);
    viewerToken = viewerRes.body.token;

    // 4. Fetch seeded service & escalation policy
    const service = await prisma.service.findFirstOrThrow();
    testServiceId = service.id;
    plaintextServiceKey = service.serviceKey;

    // 5. Create a test incident for RBAC mutation verification
    const inc = await prisma.incident.create({
      data: {
        title: "Database Read Replica Delay",
        status: IncidentStatus.TRIGGERED,
        urgency: IncidentUrgency.HIGH,
        serviceId: service.id,
        fingerprint: `test:unit17:${Date.now()}`,
        escalationStep: 1,
        logs: {
          create: {
            action: IncidentLogAction.TRIGGERED,
            message: "Test incident triggered for Unit 17 security test",
          },
        },
      },
    });
    testIncidentId = inc.id;

    // 6. Fetch seeded schedule
    const schedule = await prisma.schedule.findFirstOrThrow({
      include: { shifts: true },
    });
    testScheduleId = schedule.id;
    testShiftId = schedule.shifts[0]?.id;
  });

  describe("1. RBAC on Incident Mutations (Acknowledge & Resolve)", () => {
    it("forbids VIEWER from acknowledging an incident (403)", async () => {
      const res = await request(app)
        .post(`/api/v1/incidents/${testIncidentId}/acknowledge`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ note: "Viewer attempting unauthorized acknowledgment" });

      assert.equal(res.status, 403);
      assert.ok(
        res.body.error?.message?.includes("Forbidden"),
        "Must return forbidden message",
      );
    });

    it("forbids VIEWER from resolving an incident (403)", async () => {
      const res = await request(app)
        .post(`/api/v1/incidents/${testIncidentId}/resolve`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ resolutionNotes: "Viewer attempting unauthorized resolution" });

      assert.equal(res.status, 403);
      assert.ok(
        res.body.error?.message?.includes("Forbidden"),
        "Must return forbidden message",
      );
    });

    it("allows RESPONDER to acknowledge an incident (200)", async () => {
      const res = await request(app)
        .post(`/api/v1/incidents/${testIncidentId}/acknowledge`)
        .set("Authorization", `Bearer ${responderToken}`)
        .send({ note: "Authorized responder acknowledging incident" });

      assert.equal(res.status, 200);
      assert.equal(res.body.incident.status, IncidentStatus.ACKNOWLEDGED);
    });

    it("allows ADMIN to resolve an incident (200)", async () => {
      const res = await request(app)
        .post(`/api/v1/incidents/${testIncidentId}/resolve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ resolutionNotes: "Authorized admin resolving incident" });

      assert.equal(res.status, 200);
      assert.equal(res.body.incident.status, IncidentStatus.RESOLVED);
    });
  });

  describe("2. RBAC on Schedules and Shift Modifications", () => {
    it("forbids VIEWER from creating an on-call schedule (403)", async () => {
      const res = await request(app)
        .post("/api/v1/schedules")
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({
          name: "Unauthorized Schedule",
          timeZone: "UTC",
        });

      assert.equal(res.status, 403);
    });

    it("forbids RESPONDER from creating an on-call schedule (403)", async () => {
      const res = await request(app)
        .post("/api/v1/schedules")
        .set("Authorization", `Bearer ${responderToken}`)
        .send({
          name: "Responder Attempting Schedule Creation",
          timeZone: "UTC",
        });

      assert.equal(res.status, 403);
    });

    it("forbids VIEWER and RESPONDER from adding shifts to a schedule (403)", async () => {
      const shiftPayload = {
        userId: "any-user-id",
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      };

      const viewerRes = await request(app)
        .post(`/api/v1/schedules/${testScheduleId}/shifts`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send(shiftPayload);
      assert.equal(viewerRes.status, 403);

      const responderRes = await request(app)
        .post(`/api/v1/schedules/${testScheduleId}/shifts`)
        .set("Authorization", `Bearer ${responderToken}`)
        .send(shiftPayload);
      assert.equal(responderRes.status, 403);
    });

    it("forbids VIEWER and RESPONDER from deleting shifts from a schedule (403)", async () => {
      if (testShiftId) {
        const viewerRes = await request(app)
          .delete(`/api/v1/schedules/${testScheduleId}/shifts/${testShiftId}`)
          .set("Authorization", `Bearer ${viewerToken}`);
        assert.equal(viewerRes.status, 403);

        const responderRes = await request(app)
          .delete(`/api/v1/schedules/${testScheduleId}/shifts/${testShiftId}`)
          .set("Authorization", `Bearer ${responderToken}`);
        assert.equal(responderRes.status, 403);
      }
    });

    it("allows ADMIN to create a schedule (201)", async () => {
      const res = await request(app)
        .post("/api/v1/schedules")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Security Admin On-Call Rotation",
          description: "Admin managed rotation",
          timeZone: "America/New_York",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.schedule.name, "Security Admin On-Call Rotation");
    });
  });

  describe("3. Service Key Masking & Protection", () => {
    it("masks serviceKey for VIEWER in GET /api/v1/services", async () => {
      const res = await request(app)
        .get("/api/v1/services")
        .set("Authorization", `Bearer ${viewerToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.services.length > 0);
      for (const srv of res.body.services) {
        assert.ok(
          srv.serviceKey.includes("••••••••"),
          `Service key must be masked for VIEWER, received: ${srv.serviceKey}`,
        );
        assert.notEqual(srv.serviceKey, plaintextServiceKey);
      }
    });

    it("masks serviceKey for RESPONDER in GET /api/v1/services/:id", async () => {
      const res = await request(app)
        .get(`/api/v1/services/${testServiceId}`)
        .set("Authorization", `Bearer ${responderToken}`);

      assert.equal(res.status, 200);
      assert.ok(
        res.body.service.serviceKey.includes("••••••••"),
        `Service key must be masked for RESPONDER, received: ${res.body.service.serviceKey}`,
      );
      assert.notEqual(res.body.service.serviceKey, plaintextServiceKey);
    });

    it("returns plaintext unmasked serviceKey for ADMIN", async () => {
      const res = await request(app)
        .get(`/api/v1/services/${testServiceId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.service.serviceKey, plaintextServiceKey);
      assert.ok(
        !res.body.service.serviceKey.includes("••••••••"),
        "Admin must receive full plaintext key",
      );
    });
  });

  describe("4. Header-First Webhook Authentication (CWE-598)", () => {
    it("authenticates via Authorization: Bearer <key> header", async () => {
      const res = await request(app)
        .post("/api/v1/webhooks/alert")
        .set("Authorization", `Bearer ${plaintextServiceKey}`)
        .send({
          title: "Bearer Header Ingest Alert",
          summary: "Testing standard Bearer token alert ingestion",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.status, "created");
    });

    it("authenticates via x-service-key header", async () => {
      const res = await request(app)
        .post("/api/v1/webhooks/alert")
        .set("x-service-key", plaintextServiceKey)
        .send({
          title: "x-service-key Ingest Alert",
          summary: "Testing x-service-key header ingestion",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.status, "created");
    });

    it("maintains backward compatibility with route parameter :serviceKey", async () => {
      const res = await request(app)
        .post(`/api/v1/webhooks/services/${plaintextServiceKey}`)
        .send({
          title: "Route Param Ingest Alert",
          summary: "Testing route param backward compatibility",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.status, "created");
    });
  });

  describe("5. Rate Limiting Middleware", () => {
    it("enforces rate limit on POST /api/v1/auth/login after 15 requests", async () => {
      resetRateLimits();

      // Send 15 valid or invalid requests within the limit
      for (let i = 0; i < 15; i++) {
        const res = await request(app).post("/api/v1/auth/login").send({
          email: "admin@incidentpulse.io",
          password: "AdminPassword123!",
        });
        assert.equal(res.status, 200);
        assert.ok(res.headers["ratelimit-limit"]);
      }

      // The 16th request must breach the rate limit and return 429
      const rateLimitedRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "admin@incidentpulse.io",
          password: "AdminPassword123!",
        });

      assert.equal(rateLimitedRes.status, 429);
      assert.ok(rateLimitedRes.headers["retry-after"]);
      assert.equal(rateLimitedRes.headers["ratelimit-remaining"], "0");
      assert.ok(
        rateLimitedRes.body.error?.message?.includes("Too many login attempts"),
      );

      // Clean store for subsequent test suites
      resetRateLimits();
    });
  });
});
