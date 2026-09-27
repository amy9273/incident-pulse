import bcrypt from "bcryptjs";
import {
  EscalationTargetType,
  IncidentLogAction,
  IncidentStatus,
  IncidentUrgency,
  TeamMemberRole,
  UserRole,
} from "@incident-pulse/shared";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

export async function seed() {
  logger.info("🌱 Starting database seeding...");

  // Clean existing data in reverse dependency order
  await prisma.incidentLog.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.service.deleteMany();
  await prisma.escalationRule.deleteMany();
  await prisma.escalationPolicy.deleteMany();
  await prisma.scheduleShift.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Users
  logger.info("Creating users...");
  const admin = await prisma.user.create({
    data: {
      email: "admin@incidentpulse.io",
      passwordHash,
      name: "System Administrator",
      role: UserRole.ADMIN,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: "sarah.chen@incidentpulse.io",
      passwordHash,
      name: "Sarah Chen (Primary On-Call)",
      role: UserRole.RESPONDER,
    },
  });

  const alex = await prisma.user.create({
    data: {
      email: "alex.kumar@incidentpulse.io",
      passwordHash,
      name: "Alex Kumar (Secondary On-Call)",
      role: UserRole.RESPONDER,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: "viewer@incidentpulse.io",
      passwordHash,
      name: "Stakeholder Viewer",
      role: UserRole.VIEWER,
    },
  });

  // 2. Teams
  logger.info("Creating teams...");
  const paymentTeam = await prisma.team.create({
    data: {
      name: "Core Payments Team",
      slug: "payments",
      description:
        "Owns checkout processing, payment provider integrations, and refunds.",
    },
  });

  const platformTeam = await prisma.team.create({
    data: {
      name: "Platform Infrastructure",
      slug: "platform-infra",
      description:
        "Maintains Kubernetes clusters, databases, and network gateways.",
    },
  });

  // 3. Team Memberships
  await prisma.teamMembership.createMany({
    data: [
      { teamId: paymentTeam.id, userId: sarah.id, role: TeamMemberRole.LEAD },
      { teamId: paymentTeam.id, userId: alex.id, role: TeamMemberRole.MEMBER },
      {
        teamId: platformTeam.id,
        userId: sarah.id,
        role: TeamMemberRole.MEMBER,
      },
      { teamId: platformTeam.id, userId: admin.id, role: TeamMemberRole.LEAD },
    ],
  });

  // 4. Schedules & Shifts
  logger.info("Creating on-call schedules & shifts...");
  const paymentSchedule = await prisma.schedule.create({
    data: {
      name: "Payments Weekly Rotation",
      description:
        "24/7 weekly primary on-call rotation for Payment Gateway services.",
      timeZone: "Asia/Singapore",
    },
  });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  await prisma.scheduleShift.createMany({
    data: [
      {
        scheduleId: paymentSchedule.id,
        userId: sarah.id,
        startTime: sevenDaysAgo,
        endTime: sevenDaysAhead,
      },
      {
        scheduleId: paymentSchedule.id,
        userId: alex.id,
        startTime: sevenDaysAhead,
        endTime: fourteenDaysAhead,
      },
    ],
  });

  // 5. Escalation Policies & Rules
  logger.info("Creating escalation policies...");
  const paymentPolicy = await prisma.escalationPolicy.create({
    data: {
      name: "Critical Payments Escalation Policy",
      description:
        "Tier 1 routes to active on-call schedule. Escalates to Alex Kumar after 5 minutes.",
      teamId: paymentTeam.id,
      rules: {
        create: [
          {
            stepNumber: 1,
            delayMinutes: 5,
            targetType: EscalationTargetType.SCHEDULE,
            targetScheduleId: paymentSchedule.id,
          },
          {
            stepNumber: 2,
            delayMinutes: 10,
            targetType: EscalationTargetType.USER,
            targetUserId: alex.id,
          },
        ],
      },
    },
  });

  const platformPolicy = await prisma.escalationPolicy.create({
    data: {
      name: "Platform Critical Escalation Policy",
      description: "Direct tier escalation for infrastructure outages.",
      teamId: platformTeam.id,
      rules: {
        create: [
          {
            stepNumber: 1,
            delayMinutes: 15,
            targetType: EscalationTargetType.USER,
            targetUserId: sarah.id,
          },
        ],
      },
    },
  });

  // 6. Services
  logger.info("Creating services with API keys...");
  const paymentService = await prisma.service.create({
    data: {
      name: "Checkout & Payment API",
      slug: "checkout-api",
      description:
        "Public checkout API processing real-time credit card charges.",
      serviceKey: "inc_live_test_payment_api_key_12345678",
      escalationPolicyId: paymentPolicy.id,
    },
  });

  const authService = await prisma.service.create({
    data: {
      name: "Authentication & Token Gateway",
      slug: "auth-gateway",
      description: "OAuth2 and session token validation service.",
      serviceKey: "inc_live_test_auth_service_key_87654321",
      escalationPolicyId: platformPolicy.id,
    },
  });

  // 7. Seed Incidents & Incident Logs
  logger.info("Creating sample incidents and logs...");
  const inc1 = await prisma.incident.create({
    data: {
      title: "Elevated 500 Error Rate in /v1/checkout/process",
      summary:
        "Spike in HTTP 500 error responses exceeding 5% threshold across all edge regions.",
      status: IncidentStatus.TRIGGERED,
      urgency: IncidentUrgency.HIGH,
      serviceId: paymentService.id,
      fingerprint: "payment-api:500-error-spike",
      escalationStep: 1,
      alertCount: 4,
      payload: {
        metric: "http_status_500_ratio",
        threshold: 0.05,
        current_value: 0.12,
        environment: "production",
      },
      logs: {
        create: {
          action: IncidentLogAction.TRIGGERED,
          message:
            "Alert triggered by Prometheus Webhook rule [High5xxErrorRate]",
          metadata: { provider: "prometheus", alertname: "High5xxErrorRate" },
        },
      },
    },
  });

  const inc2 = await prisma.incident.create({
    data: {
      title: "PostgreSQL Connection Pool Exhaustion on Session Store",
      summary:
        "Active connection count reached 98% pool capacity for over 2 minutes.",
      status: IncidentStatus.ACKNOWLEDGED,
      urgency: IncidentUrgency.HIGH,
      serviceId: authService.id,
      assigneeId: sarah.id,
      fingerprint: "auth-service:db-pool-exhausted",
      escalationStep: 1,
      alertCount: 1,
      acknowledgedAt: new Date(now.getTime() - 12 * 60 * 1000),
      payload: {
        metric: "pg_stat_activity_count",
        max_connections: 100,
        active_connections: 98,
      },
      logs: {
        create: [
          {
            action: IncidentLogAction.TRIGGERED,
            message: "Incident triggered by Datadog Postgres Monitor",
            createdAt: new Date(now.getTime() - 15 * 60 * 1000),
          },
          {
            action: IncidentLogAction.ACKNOWLEDGED,
            actorId: sarah.id,
            message: "Sarah Chen acknowledged the incident via Web Dashboard",
            createdAt: new Date(now.getTime() - 12 * 60 * 1000),
          },
        ],
      },
    },
  });

  const inc3 = await prisma.incident.create({
    data: {
      title: "Stripe Webhook Delivery Latency Spike",
      summary: "Stripe webhook acknowledgement latency increased to 2400ms.",
      status: IncidentStatus.RESOLVED,
      urgency: IncidentUrgency.LOW,
      serviceId: paymentService.id,
      assigneeId: alex.id,
      fingerprint: "payment-api:stripe-webhook-latency",
      escalationStep: 1,
      alertCount: 2,
      acknowledgedAt: new Date(now.getTime() - 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 30 * 60 * 1000),
      payload: {
        avg_latency_ms: 2400,
        normal_baseline_ms: 350,
      },
      logs: {
        create: [
          {
            action: IncidentLogAction.TRIGGERED,
            message: "Incident triggered by Stripe Webhook Latency Monitor",
            createdAt: new Date(now.getTime() - 75 * 60 * 1000),
          },
          {
            action: IncidentLogAction.ACKNOWLEDGED,
            actorId: alex.id,
            message: "Alex Kumar acknowledged incident",
            createdAt: new Date(now.getTime() - 60 * 60 * 1000),
          },
          {
            action: IncidentLogAction.RESOLVED,
            actorId: alex.id,
            message:
              "Alex Kumar resolved incident. Root cause: transient upstream network throttle resolved.",
            createdAt: new Date(now.getTime() - 30 * 60 * 1000),
          },
        ],
      },
    },
  });

  logger.info(
    {
      users: [admin.email, sarah.email, alex.email, viewer.email],
      teams: [paymentTeam.name, platformTeam.name],
      services: [paymentService.name, authService.name],
      incidents: [inc1.id, inc2.id, inc3.id],
    },
    "✅ Database seeded successfully!",
  );
}

if (process.argv[1] && process.argv[1].includes("seed")) {
  seed()
    .catch((e) => {
      logger.error({ error: e }, "❌ Database seed failed");
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
