import { describe, it } from "node:test";
import assert from "node:assert";
import request from "supertest";
import { createApp } from "../app.js";

describe("Health & Status Probes (Unit 01 / Unit 02)", () => {
  const app = createApp();

  it("GET / should return operational welcome message", async () => {
    const res = await request(app).get("/");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, "IncidentPulse API");
    assert.strictEqual(res.body.status, "operational");
  });

  it("GET /health/live (Liveness Probe) returns 200 without DB calls (Invariant #6)", async () => {
    const res = await request(app).get("/health/live");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "alive");
    assert.ok(typeof res.body.uptime === "number");
    assert.ok(res.headers["x-correlation-id"], "Must include correlation ID");
  });

  it("GET /health/ready (Readiness Probe) validates PostgreSQL and Redis connectivity", async () => {
    const res = await request(app).get("/health/ready");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "ready");
    assert.strictEqual(res.body.checks.database.status, "healthy");
    assert.strictEqual(res.body.checks.redis.status, "healthy");
    assert.ok(typeof res.body.checks.database.latencyMs === "number");
    assert.ok(typeof res.body.checks.redis.latencyMs === "number");
  });
});
