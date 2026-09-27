import { describe, it, before } from "node:test";
import assert from "node:assert";
import request from "supertest";
import express from "express";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { seed } from "../seeds/seed.js";
import { IncidentStatus, IncidentUrgency } from "@incident-pulse/shared";

describe("Alert Ingestion Webhook & Deduplication Engine (Unit 04)", () => {
  let app: express.Express;
  const validServiceKey = "inc_live_test_payment_api_key_12345678";

  before(async () => {
    await seed();
    app = createApp();
  });

  describe("POST /api/v1/webhooks/services/:serviceKey", () => {
    it("creates a new TRIGGERED incident on first alert (HTTP 201)", async () => {
      const payload = {
        title: "High Database Latency on Checkout DB",
        summary: "P99 query latency exceeded 1500ms for 3 consecutive minutes",
        urgency: IncidentUrgency.HIGH,
        payload: { latencyMs: 1650, threshold: 1000 },
      };

      const res = await request(app)
        .post(`/api/v1/webhooks/services/${validServiceKey}`)
        .send(payload);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, "created");
      assert.strictEqual(res.body.alertCount, 1);
      assert.ok(res.body.incidentId, "Must return created incident ID");
      assert.strictEqual(res.body.incident.title, payload.title);
      assert.strictEqual(res.body.incident.status, IncidentStatus.TRIGGERED);

      // Verify in database
      const dbIncident = await prisma.incident.findUnique({
        where: { id: res.body.incidentId },
        include: { logs: true },
      });
      assert.ok(dbIncident, "Incident must exist in PostgreSQL");
      assert.strictEqual(dbIncident.alertCount, 1);
      const triggeredLog = dbIncident.logs.find(
        (l) => l.action === "TRIGGERED",
      );
      assert.ok(triggeredLog, "Must have TRIGGERED log entry");
    });

    it("deduplicates identical incoming alerts for open incident (Invariant #2, HTTP 200)", async () => {
      const payload = {
        title: "High Database Latency on Checkout DB",
        summary: "P99 query latency is now 2100ms",
        urgency: IncidentUrgency.HIGH,
        payload: { latencyMs: 2100, threshold: 1000 },
      };

      const res = await request(app)
        .post(`/api/v1/webhooks/services/${validServiceKey}`)
        .send(payload);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "deduplicated");
      assert.strictEqual(res.body.alertCount, 2);

      // Verify incident log was appended
      const dbIncident = await prisma.incident.findUnique({
        where: { id: res.body.incidentId },
        include: { logs: { orderBy: { createdAt: "asc" } } },
      });
      assert.ok(dbIncident);
      assert.strictEqual(dbIncident.alertCount, 2);
      const dedupLog = dbIncident.logs.find((l) =>
        l.message.includes("Deduplicated alert received (occurrence #2)"),
      );
      assert.ok(dedupLog, "Must contain deduplication log entry");
    });

    it("deduplicates incoming alerts when incident is ACKNOWLEDGED without resetting status", async () => {
      // Find open incident and set to ACKNOWLEDGED
      const openIncident = await prisma.incident.findFirstOrThrow({
        where: { title: "High Database Latency on Checkout DB" },
      });

      await prisma.incident.update({
        where: { id: openIncident.id },
        data: { status: IncidentStatus.ACKNOWLEDGED },
      });

      const payload = {
        title: "High Database Latency on Checkout DB",
        summary: "P99 latency still elevated at 1800ms",
        urgency: IncidentUrgency.HIGH,
      };

      const res = await request(app)
        .post(`/api/v1/webhooks/services/${validServiceKey}`)
        .send(payload);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "deduplicated");
      assert.strictEqual(res.body.alertCount, 3);
      assert.strictEqual(
        res.body.incident.status,
        IncidentStatus.ACKNOWLEDGED,
        "Status must remain ACKNOWLEDGED",
      );
    });

    it("creates a brand new incident if the previous incident was RESOLVED", async () => {
      // Find incident and resolve it
      const existingIncident = await prisma.incident.findFirstOrThrow({
        where: { title: "High Database Latency on Checkout DB" },
      });

      await prisma.incident.update({
        where: { id: existingIncident.id },
        data: {
          status: IncidentStatus.RESOLVED,
          resolvedAt: new Date(),
        },
      });

      // Send same alert again
      const payload = {
        title: "High Database Latency on Checkout DB",
        summary: "Database spike returned after resolution",
        urgency: IncidentUrgency.HIGH,
      };

      const res = await request(app)
        .post(`/api/v1/webhooks/services/${validServiceKey}`)
        .send(payload);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, "created");
      assert.notStrictEqual(
        res.body.incidentId,
        existingIncident.id,
        "Must be a new incident ID",
      );
      assert.strictEqual(res.body.alertCount, 1);
    });

    it("supports custom caller-provided fingerprint for deduplication", async () => {
      const customFingerprint = "k8s-pod-crashloop-auth-svc-0042";

      const alert1 = {
        title: "Auth Service Pod OOMKilled in namespace prod",
        fingerprint: customFingerprint,
        urgency: IncidentUrgency.HIGH,
      };

      const res1 = await request(app)
        .post(`/api/v1/webhooks/services/${validServiceKey}`)
        .send(alert1);

      assert.strictEqual(res1.status, 201);
      assert.strictEqual(res1.body.incident.fingerprint, customFingerprint);

      // Send alert with different title but identical custom fingerprint
      const alert2 = {
        title: "Auth Service Pod Restart Attempt Failed",
        fingerprint: customFingerprint,
        urgency: IncidentUrgency.HIGH,
      };

      const res2 = await request(app)
        .post(`/api/v1/webhooks/services/${validServiceKey}`)
        .send(alert2);

      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.status, "deduplicated");
      assert.strictEqual(res2.body.incidentId, res1.body.incidentId);
      assert.strictEqual(res2.body.alertCount, 2);
    });
  });

  describe("POST /api/v1/webhooks/alert (Header Auth)", () => {
    it("authenticates via Authorization: Bearer header", async () => {
      const payload = {
        title: "Payment Gateway 502 Bad Gateway Spike",
        urgency: IncidentUrgency.HIGH,
      };

      const res = await request(app)
        .post("/api/v1/webhooks/alert")
        .set("Authorization", `Bearer ${validServiceKey}`)
        .send(payload);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, "created");
    });
  });

  describe("Validation & Authentication Error Handling", () => {
    it("returns 401 Unauthorized for invalid service key", async () => {
      const res = await request(app)
        .post("/api/v1/webhooks/services/inc_live_nonexistent_key_9999")
        .send({ title: "Test Alert" });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(
        res.body.error.message,
        "Invalid or inactive service API key",
      );
    });

    it("returns 400 Bad Request when title is missing", async () => {
      const res = await request(app)
        .post(`/api/v1/webhooks/services/${validServiceKey}`)
        .send({
          summary: "Missing title payload",
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.message, "Validation failed");
      assert.ok(Array.isArray(res.body.error.details));
    });

    it("returns 400 Bad Request when urgency value is invalid", async () => {
      const res = await request(app)
        .post(`/api/v1/webhooks/services/${validServiceKey}`)
        .send({
          title: "Valid Title",
          urgency: "CRITICAL_SUPER_HIGH", // invalid enum
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.message, "Validation failed");
    });
  });
});
