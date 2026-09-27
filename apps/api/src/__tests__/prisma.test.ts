import { describe, it, before } from "node:test";
import assert from "node:assert";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { seed } from "../seeds/seed.js";
import {
  IncidentStatus,
  IncidentUrgency,
  UserRole,
} from "@incident-pulse/shared";

describe("Prisma Relational Models & Integrity (Unit 02)", () => {
  before(async () => {
    // Seed database before running tests
    await seed();
  });

  it("should query seeded users with proper roles", async () => {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@incidentpulse.io" },
    });
    assert.ok(admin, "Admin user must exist");
    assert.strictEqual(admin.role, UserRole.ADMIN);

    const responders = await prisma.user.findMany({
      where: { role: UserRole.RESPONDER },
    });
    assert.strictEqual(responders.length, 2, "Must have 2 responders seeded");
  });

  it("should query teams and team memberships with relations", async () => {
    const paymentTeam = await prisma.team.findUnique({
      where: { slug: "payments" },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
      },
    });

    assert.ok(paymentTeam, "Payment team must exist");
    assert.ok(
      paymentTeam.memberships.length >= 2,
      "Payment team must have members",
    );
    const lead = paymentTeam.memberships.find(
      (m: { role: string; user: { email: string } }) => m.role === "LEAD",
    );
    assert.ok(lead, "Must have a team lead");
    assert.ok(lead.user, "Lead must have user relation");
    assert.strictEqual(lead.user.email, "sarah.chen@incidentpulse.io");
  });

  it("should query services and their associated escalation policies and rules", async () => {
    const service = await prisma.service.findUnique({
      where: { slug: "checkout-api" },
      include: {
        escalationPolicy: {
          include: {
            rules: {
              orderBy: { stepNumber: "asc" },
            },
          },
        },
      },
    });

    assert.ok(service, "Checkout API service must exist");
    assert.strictEqual(
      service.serviceKey,
      "inc_live_test_payment_api_key_12345678",
    );
    assert.ok(
      service.escalationPolicy,
      "Service must have an escalation policy",
    );
    assert.strictEqual(
      service.escalationPolicy.rules.length,
      2,
      "Policy must have 2 rules",
    );
    const firstRule = service.escalationPolicy.rules[0];
    const secondRule = service.escalationPolicy.rules[1];
    assert.ok(firstRule, "First rule must exist");
    assert.ok(secondRule, "Second rule must exist");
    assert.strictEqual(firstRule.stepNumber, 1);
    assert.strictEqual(firstRule.delayMinutes, 5);
  });

  it("should query active incidents and immutable incident logs", async () => {
    const incidents = await prisma.incident.findMany({
      where: { status: IncidentStatus.TRIGGERED },
      include: {
        service: true,
        logs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    assert.ok(incidents.length > 0, "Must find triggered incident");
    const triggeredIncident = incidents[0];
    assert.ok(triggeredIncident, "Triggered incident must exist");
    assert.strictEqual(triggeredIncident.urgency, IncidentUrgency.HIGH);
    assert.ok(triggeredIncident.logs.length > 0, "Must have incident logs");
    const firstLog = triggeredIncident.logs[0];
    assert.ok(firstLog, "First log must exist");
    assert.strictEqual(firstLog.action, "TRIGGERED");
  });

  it("should support transactional updates and audit logging (Invariant #3)", async () => {
    const service = await prisma.service.findFirstOrThrow();
    const responder = await prisma.user.findFirstOrThrow({
      where: { role: UserRole.RESPONDER },
    });

    // Create incident and transition state inside a transaction
    const newIncident = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const inc = await tx.incident.create({
          data: {
            title: "Test Invariant Transaction Incident",
            status: IncidentStatus.TRIGGERED,
            urgency: IncidentUrgency.HIGH,
            serviceId: service.id,
            fingerprint: `test:invariant:${Date.now()}`,
            logs: {
              create: {
                action: "TRIGGERED",
                message: "Test incident triggered",
              },
            },
          },
        });

        // Acknowledge in same transaction
        const acked = await tx.incident.update({
          where: { id: inc.id },
          data: {
            status: IncidentStatus.ACKNOWLEDGED,
            assigneeId: responder.id,
            acknowledgedAt: new Date(),
          },
        });

        await tx.incidentLog.create({
          data: {
            incidentId: inc.id,
            actorId: responder.id,
            action: "ACKNOWLEDGED",
            message: "Acknowledged in transaction test",
          },
        });

        return acked;
      },
    );

    assert.strictEqual(newIncident.status, IncidentStatus.ACKNOWLEDGED);
    assert.strictEqual(newIncident.assigneeId, responder.id);

    // Verify logs
    const logs = await prisma.incidentLog.findMany({
      where: { incidentId: newIncident.id },
      orderBy: { createdAt: "asc" },
    });
    assert.strictEqual(logs.length, 2, "Must have 2 audit logs recorded");
    const log0 = logs[0];
    const log1 = logs[1];
    assert.ok(log0, "Log 0 must exist");
    assert.ok(log1, "Log 1 must exist");
    assert.strictEqual(log0.action, "TRIGGERED");
    assert.strictEqual(log1.action, "ACKNOWLEDGED");
  });
});
