import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { seed } from "../seeds/seed.js";

const app = createApp();

describe("Service & Webhook Integration Manager (Unit 10)", () => {
  let adminToken: string;
  let responderToken: string;
  let testPolicyId: string;
  let createdServiceId: string;
  let createdServiceKey: string;
  let rotatedServiceKey: string;

  before(async () => {
    await seed();

    // Authenticate as Admin
    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: "admin@incidentpulse.io",
      password: "AdminPassword123!",
    });
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.token;

    // Authenticate as Responder
    const responderLogin = await request(app).post("/api/v1/auth/login").send({
      email: "sarah.chen@incidentpulse.io",
      password: "ResponderPassword123!",
    });
    assert.equal(responderLogin.status, 200);
    responderToken = responderLogin.body.token;

    // Get an existing seeded escalation policy
    const policy = await prisma.escalationPolicy.findFirstOrThrow();
    testPolicyId = policy.id;
  });

  describe("GET /api/v1/services", () => {
    it("should reject unauthenticated request with 401", async () => {
      const res = await request(app).get("/api/v1/services");
      assert.equal(res.status, 401);
    });

    it("should return all monitored services with metrics", async () => {
      const res = await request(app)
        .get("/api/v1/services")
        .set("Authorization", `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.services));
      assert.ok(res.body.services.length >= 2);

      const srv = res.body.services[0];
      assert.ok(srv.id);
      assert.ok(srv.name);
      assert.ok(srv.serviceKey.startsWith("inc_live_"));
      assert.ok(srv.escalationPolicy);
      assert.ok(typeof srv.totalIncidents === "number");
      assert.ok(typeof srv.activeIncidents === "number");
      assert.ok(["HEALTHY", "CRITICAL"].includes(srv.status));
    });
  });

  describe("POST /api/v1/services", () => {
    it("should forbid non-admin from creating service (403)", async () => {
      const res = await request(app)
        .post("/api/v1/services")
        .set("Authorization", `Bearer ${responderToken}`)
        .send({
          name: "User Identity Service",
          escalationPolicyId: testPolicyId,
        });

      assert.equal(res.status, 403);
    });

    it("should allow admin to create a new monitored service", async () => {
      const res = await request(app)
        .post("/api/v1/services")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "User Identity Service",
          description: "OAuth2 authentication and session tokens",
          escalationPolicyId: testPolicyId,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.service.name, "User Identity Service");
      assert.equal(res.body.service.slug, "user-identity-service");
      assert.ok(res.body.service.serviceKey.startsWith("inc_live_"));
      assert.equal(res.body.service.escalationPolicyId, testPolicyId);

      createdServiceId = res.body.service.id;
      createdServiceKey = res.body.service.serviceKey;
    });

    it("should reject invalid service creation payload", async () => {
      const res = await request(app)
        .post("/api/v1/services")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "",
        });

      assert.equal(res.status, 400);
    });
  });

  describe("GET /api/v1/services/:id", () => {
    it("should retrieve single service by ID with escalation policy", async () => {
      const res = await request(app)
        .get(`/api/v1/services/${createdServiceId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.service.id, createdServiceId);
      assert.equal(res.body.service.name, "User Identity Service");
      assert.ok(res.body.service.escalationPolicy);
      assert.ok(Array.isArray(res.body.service.escalationPolicy.rules));
    });
  });

  describe("POST /api/v1/services/:id/rotate-key", () => {
    it("should rotate service key and invalidate previous key", async () => {
      const res = await request(app)
        .post(`/api/v1/services/${createdServiceId}/rotate-key`)
        .set("Authorization", `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.service.serviceKey.startsWith("inc_live_"));
      assert.notEqual(res.body.service.serviceKey, createdServiceKey);

      rotatedServiceKey = res.body.service.serviceKey;

      // Old key should now fail webhook authentication
      const oldKeyRes = await request(app)
        .post(`/api/v1/webhooks/services/${createdServiceKey}`)
        .send({ title: "Test Old Key Alert" });
      assert.equal(oldKeyRes.status, 401);

      // New key should succeed
      const newKeyRes = await request(app)
        .post(`/api/v1/webhooks/services/${rotatedServiceKey}`)
        .send({
          title: "Test New Key Alert",
          summary: "Testing newly rotated key",
        });
      assert.equal(newKeyRes.status, 201);
    });
  });

  describe("PUT /api/v1/services/:id", () => {
    it("should update service metadata", async () => {
      const res = await request(app)
        .put(`/api/v1/services/${createdServiceId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "User Identity & Auth Service",
          description: "Updated service description",
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.service.name, "User Identity & Auth Service");
      assert.equal(res.body.service.description, "Updated service description");
    });
  });

  describe("DELETE /api/v1/services/:id", () => {
    it("should delete a service after active incidents are resolved", async () => {
      // First resolve the incident created by the rotate-key test
      await prisma.incident.updateMany({
        where: { serviceId: createdServiceId },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });

      const res = await request(app)
        .delete(`/api/v1/services/${createdServiceId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      assert.equal(res.status, 204);

      // Verify it is no longer returned in active services
      const getRes = await request(app)
        .get(`/api/v1/services/${createdServiceId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      assert.equal(getRes.status, 404);
    });
  });

  describe("Escalation Policies API", () => {
    it("should list all escalation policies", async () => {
      const res = await request(app)
        .get("/api/v1/escalation-policies")
        .set("Authorization", `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.policies));
      assert.ok(res.body.policies.length >= 2);
      assert.ok(res.body.policies[0].rules.length >= 1);
    });

    it("should create a new multi-tier escalation policy", async () => {
      const user = await prisma.user.findFirstOrThrow({
        where: { email: "sarah.chen@incidentpulse.io" },
      });

      const schedule = await prisma.schedule.findFirstOrThrow();

      const res = await request(app)
        .post("/api/v1/escalation-policies")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Edge Gateway Multi-Tier Escalation",
          description:
            "Tier 1 on-call schedule, Tier 2 escalation to Sarah Chen",
          rules: [
            {
              stepNumber: 1,
              delayMinutes: 5,
              targetType: "SCHEDULE",
              targetScheduleId: schedule.id,
            },
            {
              stepNumber: 2,
              delayMinutes: 10,
              targetType: "USER",
              targetUserId: user.id,
            },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.policy.name, "Edge Gateway Multi-Tier Escalation");
      assert.equal(res.body.policy.rules.length, 2);
      assert.equal(res.body.policy.rules[0].targetType, "SCHEDULE");
      assert.equal(res.body.policy.rules[1].targetType, "USER");
    });
  });
});
