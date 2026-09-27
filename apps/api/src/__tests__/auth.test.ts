import { describe, it, before } from "node:test";
import assert from "node:assert";
import request from "supertest";
import express from "express";
import { authRouter } from "../routes/auth.routes.js";
import { correlationMiddleware } from "../middlewares/correlation.middleware.js";
import { errorMiddleware } from "../middlewares/error.middleware.js";
import { seed } from "../seeds/seed.js";
import { UserRole } from "@incident-pulse/shared";
import {
  authenticateJwt,
  requireRole,
} from "../middlewares/auth.middleware.js";
import { authenticateServiceKey } from "../middlewares/service-key.middleware.js";

describe("Authentication & Service Key Middleware (Unit 03)", () => {
  let app: express.Express;

  before(async () => {
    // Ensure clean seeded state
    await seed();

    app = express();
    app.use(express.json());
    app.use(correlationMiddleware);
    app.use("/api/v1/auth", authRouter);

    // Attach test routes to verify middlewares in isolation
    app.get(
      "/api/v1/test/admin-only",
      authenticateJwt,
      requireRole([UserRole.ADMIN]),
      (req, res) => {
        res.json({ status: "success", user: req.user });
      },
    );

    app.get(
      "/api/v1/test/responder-only",
      authenticateJwt,
      requireRole([UserRole.RESPONDER]),
      (req, res) => {
        res.json({ status: "success", user: req.user });
      },
    );

    app.post(
      "/api/v1/test/service-key-auth",
      authenticateServiceKey,
      (req, res) => {
        res.json({ status: "success", service: req.service });
      },
    );

    app.post(
      "/api/v1/test/service-key-param/:serviceKey",
      authenticateServiceKey,
      (req, res) => {
        res.json({ status: "success", service: req.service });
      },
    );

    // Centralized Error Middleware MUST be last
    app.use(errorMiddleware);
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login successfully with valid admin credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "admin@incidentpulse.io",
        password: "AdminPassword123!",
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.token, "Must return JWT token");
      assert.strictEqual(res.body.user.email, "admin@incidentpulse.io");
      assert.strictEqual(res.body.user.role, UserRole.ADMIN);
    });

    it("should login successfully with valid responder credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "sarah.chen@incidentpulse.io",
        password: "ResponderPassword123!",
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.token, "Must return JWT token");
      assert.strictEqual(res.body.user.email, "sarah.chen@incidentpulse.io");
      assert.strictEqual(res.body.user.role, UserRole.RESPONDER);
    });

    it("should return 401 when password is wrong", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "admin@incidentpulse.io",
        password: "WrongPassword999!",
      });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.message, "Invalid email or password");
    });

    it("should return 401 when user does not exist", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "nonexistent@incidentpulse.io",
        password: "SomePassword123!",
      });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error.message, "Invalid email or password");
    });

    it("should return 400 when payload is invalid", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "not-an-email",
        password: "123", // too short
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.message, "Validation failed");
      assert.ok(Array.isArray(res.body.error.details));
    });
  });

  describe("GET /api/v1/auth/me", () => {
    let adminToken: string;

    before(async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "admin@incidentpulse.io",
        password: "AdminPassword123!",
      });
      adminToken = res.body.token;
    });

    it("should return profile for authenticated user with valid token", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.user.email, "admin@incidentpulse.io");
      assert.strictEqual(res.body.user.role, UserRole.ADMIN);
    });

    it("should return 401 when Authorization header is missing", async () => {
      const res = await request(app).get("/api/v1/auth/me");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(
        res.body.error.message,
        "Authorization header is missing",
      );
    });

    it("should return 401 when Bearer scheme is malformed", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Basic some_basic_token");

      assert.strictEqual(res.status, 401);
    });

    it("should return 401 when token is invalid or corrupted", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid.jwt.token");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(
        res.body.error.message,
        "Invalid authentication token",
      );
    });
  });

  describe("Role-Based Access Control (requireRole)", () => {
    let adminToken: string;
    let responderToken: string;

    before(async () => {
      const adminRes = await request(app).post("/api/v1/auth/login").send({
        email: "admin@incidentpulse.io",
        password: "AdminPassword123!",
      });
      adminToken = adminRes.body.token;

      const responderRes = await request(app).post("/api/v1/auth/login").send({
        email: "sarah.chen@incidentpulse.io",
        password: "ResponderPassword123!",
      });
      responderToken = responderRes.body.token;
    });

    it("allows ADMIN to access admin-only route", async () => {
      const res = await request(app)
        .get("/api/v1/test/admin-only")
        .set("Authorization", `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "success");
    });

    it("forbids RESPONDER from accessing admin-only route (403)", async () => {
      const res = await request(app)
        .get("/api/v1/test/admin-only")
        .set("Authorization", `Bearer ${responderToken}`);

      assert.strictEqual(res.status, 403);
      assert.ok(
        res.body.error.message.includes("Forbidden"),
        "Should return forbidden error message",
      );
    });

    it("allows RESPONDER to access responder-only route", async () => {
      const res = await request(app)
        .get("/api/v1/test/responder-only")
        .set("Authorization", `Bearer ${responderToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "success");
    });
  });

  describe("Service API Key Verification (authenticateServiceKey)", () => {
    const validKey = "inc_live_test_payment_api_key_12345678";

    it("authenticates via Authorization: Bearer <serviceKey>", async () => {
      const res = await request(app)
        .post("/api/v1/test/service-key-auth")
        .set("Authorization", `Bearer ${validKey}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.service.serviceKey, validKey);
      assert.strictEqual(res.body.service.slug, "checkout-api");
    });

    it("authenticates via x-service-key header", async () => {
      const res = await request(app)
        .post("/api/v1/test/service-key-auth")
        .set("x-service-key", validKey);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.service.slug, "checkout-api");
    });

    it("authenticates via route param :serviceKey", async () => {
      const res = await request(app).post(
        `/api/v1/test/service-key-param/${validKey}`,
      );

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.service.slug, "checkout-api");
    });

    it("returns 401 when service key is invalid", async () => {
      const res = await request(app)
        .post("/api/v1/test/service-key-auth")
        .set("Authorization", "Bearer inc_live_invalid_key_9999");

      assert.strictEqual(res.status, 401);
      assert.strictEqual(
        res.body.error.message,
        "Invalid or inactive service API key",
      );
    });

    it("returns 401 when service key is missing entirely", async () => {
      const res = await request(app).post("/api/v1/test/service-key-auth");

      assert.strictEqual(res.status, 401);
    });
  });
});
