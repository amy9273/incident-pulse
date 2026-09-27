import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { seed } from "../seeds/seed.js";

const app = createApp();

describe("Schedule & Shift Management (Unit 09)", () => {
  let authToken: string;
  let testUserId: string;
  let testScheduleId: string;

  before(async () => {
    await seed();
    // Authenticate as Admin
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "admin@incidentpulse.io",
      password: "AdminPassword123!",
    });

    assert.equal(loginRes.status, 200);
    authToken = loginRes.body.token;

    // Get a test responder user
    const user = await prisma.user.findFirst({
      where: { email: "sarah.chen@incidentpulse.io" },
    });
    assert.ok(user, "Sarah Chen user fixture should exist");
    testUserId = user.id;
  });

  describe("GET /api/v1/schedules", () => {
    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/v1/schedules");
      assert.equal(res.status, 401);
    });

    it("should return all schedules with active on-call user", async () => {
      const res = await request(app)
        .get("/api/v1/schedules")
        .set("Authorization", `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.schedules));
      assert.ok(res.body.schedules.length >= 1);

      const schedule = res.body.schedules[0];
      assert.ok(schedule.id);
      assert.ok(schedule.name);
      assert.ok(schedule.timeZone);
    });
  });

  describe("POST /api/v1/schedules", () => {
    it("should create a new on-call schedule", async () => {
      const res = await request(app)
        .post("/api/v1/schedules")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "SRE Reliability Team Schedule",
          description: "24x7 rotation for SRE team",
          timeZone: "Asia/Singapore",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.schedule.name, "SRE Reliability Team Schedule");
      assert.equal(res.body.schedule.timeZone, "Asia/Singapore");

      testScheduleId = res.body.schedule.id;
    });

    it("should reject invalid schedule payload", async () => {
      const res = await request(app)
        .post("/api/v1/schedules")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "",
        });

      assert.equal(res.status, 400);
    });
  });

  describe("POST /api/v1/schedules/:id/shifts and DELETE", () => {
    let createdShiftId: string;

    it("should add a shift rotation to the schedule", async () => {
      const startTime = new Date();
      const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days later

      const res = await request(app)
        .post(`/api/v1/schedules/${testScheduleId}/shifts`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          userId: testUserId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      assert.equal(res.status, 201);
      createdShiftId = res.body.shift.id;
      assert.equal(res.body.shift.userId, testUserId);
      assert.ok(res.body.shift.userName.includes("Sarah Chen"));
    });

    it("should retrieve schedule by ID with active shifts", async () => {
      const res = await request(app)
        .get(`/api/v1/schedules/${testScheduleId}`)
        .set("Authorization", `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.schedule.id, testScheduleId);
      assert.ok(res.body.schedule.shifts.length >= 1);
      assert.ok(res.body.schedule.currentOnCallUser);
      assert.equal(res.body.schedule.currentOnCallUser.id, testUserId);
    });

    it("should delete a shift rotation", async () => {
      const res = await request(app)
        .delete(`/api/v1/schedules/${testScheduleId}/shifts/${createdShiftId}`)
        .set("Authorization", `Bearer ${authToken}`);

      assert.equal(res.status, 204);
    });
  });

  describe("GET /api/v1/users", () => {
    it("should list all available responder users", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${authToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.users));
      assert.ok(res.body.users.length >= 3);
      assert.ok(
        res.body.users.some(
          (u: { email: string }) => u.email === "sarah.chen@incidentpulse.io",
        ),
      );
    });
  });
});
