import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import { AddressInfo } from "node:net";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { seed } from "../seeds/seed.js";
import { authService } from "../services/auth.service.js";
import {
  initSocketServer,
  closeSocketServer,
} from "../sockets/socket.server.js";
import {
  IncidentDetail,
  IncidentStatus,
  UserRole,
  WebSocketEvent,
} from "@incident-pulse/shared";

describe("Real-Time WebSocket Server (Unit 06)", () => {
  let httpServer: http.Server;
  let serverPort: number;
  let validToken: string;
  let adminUser: { id: string; email: string; name: string; role: UserRole };
  const serviceKey = "inc_live_test_payment_api_key_12345678";
  let targetService: { id: string; name: string; serviceKey: string };

  before(async () => {
    // 1. Seed database state
    await seed();

    const dbUser = await prisma.user.findFirstOrThrow({
      where: { email: "admin@incidentpulse.io" },
    });
    adminUser = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as UserRole,
    };
    validToken = authService.generateToken(adminUser);

    const serviceRecord = await prisma.service.findFirstOrThrow({
      where: { serviceKey },
    });
    targetService = {
      id: serviceRecord.id,
      name: serviceRecord.name,
      serviceKey: serviceRecord.serviceKey,
    };

    // 2. Spin up HTTP & Socket.io server on ephemeral port
    const app = createApp();
    httpServer = http.createServer(app);
    initSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = (httpServer.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  after(async () => {
    await closeSocketServer();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    await prisma.$disconnect();
    redis.disconnect();
  });

  describe("Authentication Handshake", () => {
    it("should reject connection when no auth token is provided", async () => {
      await new Promise<void>((resolve, reject) => {
        const client: ClientSocket = Client(`http://localhost:${serverPort}`, {
          transports: ["websocket"],
          autoConnect: true,
          timeout: 2000,
        });

        client.on("connect", () => {
          client.disconnect();
          reject(new Error("Connection should have been rejected"));
        });

        client.on("connect_error", (err) => {
          assert.ok(
            err.message.includes("token is missing") ||
              err.message.includes("Unauthorized"),
          );
          client.disconnect();
          resolve();
        });
      });
    });

    it("should reject connection when invalid auth token is provided", async () => {
      await new Promise<void>((resolve, reject) => {
        const client: ClientSocket = Client(`http://localhost:${serverPort}`, {
          auth: { token: "invalid.jwt.token" },
          transports: ["websocket"],
          autoConnect: true,
          timeout: 2000,
        });

        client.on("connect", () => {
          client.disconnect();
          reject(new Error("Connection should have been rejected"));
        });

        client.on("connect_error", (err) => {
          assert.ok(err.message.includes("Unauthorized"));
          client.disconnect();
          resolve();
        });
      });
    });

    it("should connect successfully with valid JWT bearer token", async () => {
      await new Promise<void>((resolve, reject) => {
        const client: ClientSocket = Client(`http://localhost:${serverPort}`, {
          auth: { token: `Bearer ${validToken}` },
          transports: ["websocket"],
          autoConnect: true,
          timeout: 2000,
        });

        client.on("connect", () => {
          assert.ok(client.connected);
          client.disconnect();
          resolve();
        });

        client.on("connect_error", (err) => {
          client.disconnect();
          reject(err);
        });
      });
    });
  });

  describe("Room Subscriptions", () => {
    it("should allow subscribing and unsubscribing from service rooms", async () => {
      const client: ClientSocket = Client(`http://localhost:${serverPort}`, {
        auth: { token: validToken },
        transports: ["websocket"],
      });

      await new Promise<void>((resolve, reject) => {
        client.on("connect", () => {
          // Subscribe to service room
          client.emit(WebSocketEvent.INCIDENT_SUBSCRIBE, {
            serviceId: targetService.id,
          });

          // Unsubscribe from service room
          client.emit(WebSocketEvent.INCIDENT_UNSUBSCRIBE, {
            serviceId: targetService.id,
          });

          setTimeout(() => {
            client.disconnect();
            resolve();
          }, 100);
        });

        client.on("connect_error", (err) => {
          client.disconnect();
          reject(err);
        });
      });
    });
  });

  describe("End-to-End Real-Time Broadcasts", () => {
    let client: ClientSocket;

    before(async () => {
      client = Client(`http://localhost:${serverPort}`, {
        auth: { token: validToken },
        transports: ["websocket"],
      });

      await new Promise<void>((resolve, reject) => {
        client.on("connect", () => resolve());
        client.on("connect_error", (err) => reject(err));
      });
    });

    after(() => {
      if (client.connected) {
        client.disconnect();
      }
    });

    it("should broadcast incident:created when a new alert is ingested", async () => {
      const uniqueTitle = `High Memory Alert ${Date.now()}`;

      const eventPromise = new Promise<IncidentDetail>((resolve) => {
        client.once(WebSocketEvent.INCIDENT_CREATED, (data: IncidentDetail) => {
          resolve(data);
        });
      });

      // Ingest alert via webhook POST
      const res = await request(httpServer)
        .post(`/api/v1/webhooks/services/${serviceKey}`)
        .send({
          title: uniqueTitle,
          summary: "Memory usage exceeded 95%",
          urgency: "HIGH",
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, "created");

      const receivedIncident = await eventPromise;
      assert.strictEqual(receivedIncident.title, uniqueTitle);
      assert.strictEqual(receivedIncident.status, IncidentStatus.TRIGGERED);
      assert.strictEqual(receivedIncident.serviceId, targetService.id);
    });

    it("should broadcast incident:updated when alert is deduplicated", async () => {
      const fixedFingerprint = `custom-dedup-fp-${Date.now()}`;

      // 1. Create first occurrence
      await request(httpServer)
        .post(`/api/v1/webhooks/services/${serviceKey}`)
        .send({
          title: "Persistent Disk Spike",
          fingerprint: fixedFingerprint,
          urgency: "HIGH",
        });

      const updatePromise = new Promise<IncidentDetail>((resolve) => {
        client.once(WebSocketEvent.INCIDENT_UPDATED, (data: IncidentDetail) => {
          resolve(data);
        });
      });

      // 2. Trigger deduplicated alert
      const res = await request(httpServer)
        .post(`/api/v1/webhooks/services/${serviceKey}`)
        .send({
          title: "Persistent Disk Spike",
          fingerprint: fixedFingerprint,
          urgency: "HIGH",
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "deduplicated");
      assert.strictEqual(res.body.alertCount, 2);

      const updatedIncident = await updatePromise;
      assert.strictEqual(updatedIncident.fingerprint, fixedFingerprint);
      assert.strictEqual(updatedIncident.alertCount, 2);
    });

    it("should broadcast incident:updated when incident is acknowledged and resolved", async () => {
      // 1. Create fresh incident
      const createRes = await request(httpServer)
        .post(`/api/v1/webhooks/services/${serviceKey}`)
        .send({
          title: `Database Deadlock ${Date.now()}`,
          urgency: "HIGH",
        });

      const incidentId = createRes.body.incidentId;

      // 2. Expect broadcast on acknowledge
      const ackPromise = new Promise<IncidentDetail>((resolve) => {
        client.once(WebSocketEvent.INCIDENT_UPDATED, (data: IncidentDetail) => {
          resolve(data);
        });
      });

      const ackRes = await request(httpServer)
        .post(`/api/v1/incidents/${incidentId}/acknowledge`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ note: "Investigating connection pool spike" });

      assert.strictEqual(ackRes.status, 200);
      assert.strictEqual(
        ackRes.body.incident.status,
        IncidentStatus.ACKNOWLEDGED,
      );

      const ackBroadcast = await ackPromise;
      assert.strictEqual(ackBroadcast.id, incidentId);
      assert.strictEqual(ackBroadcast.status, IncidentStatus.ACKNOWLEDGED);

      // 3. Expect broadcast on resolve
      const resolvePromise = new Promise<IncidentDetail>((resolve) => {
        client.once(WebSocketEvent.INCIDENT_UPDATED, (data: IncidentDetail) => {
          resolve(data);
        });
      });

      const resolveRes = await request(httpServer)
        .post(`/api/v1/incidents/${incidentId}/resolve`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ resolutionNotes: "Killed blocking query" });

      assert.strictEqual(resolveRes.status, 200);
      assert.strictEqual(
        resolveRes.body.incident.status,
        IncidentStatus.RESOLVED,
      );

      const resolveBroadcast = await resolvePromise;
      assert.strictEqual(resolveBroadcast.id, incidentId);
      assert.strictEqual(resolveBroadcast.status, IncidentStatus.RESOLVED);
    });
  });
});
