import {
  CreateEscalationPolicyRequest,
  EscalationPolicyDetail,
} from "@incident-pulse/shared";
import { prisma } from "../lib/prisma.js";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { logger } from "../lib/logger.js";

export class EscalationPolicyService {
  /**
   * List all active escalation policies with their multi-tier rules and bound services count.
   */
  async listEscalationPolicies(): Promise<EscalationPolicyDetail[]> {
    const policies = await prisma.escalationPolicy.findMany({
      where: { deletedAt: null },
      include: {
        team: {
          select: { id: true, name: true, slug: true },
        },
        rules: {
          include: {
            targetUser: {
              select: { id: true, name: true, email: true },
            },
            targetSchedule: {
              select: { id: true, name: true },
            },
          },
          orderBy: { stepNumber: "asc" },
        },
        _count: {
          select: { services: { where: { deletedAt: null } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return policies.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      teamId: p.teamId,
      team: p.team,
      rules: p.rules.map((r) => ({
        id: r.id,
        stepNumber: r.stepNumber,
        delayMinutes: r.delayMinutes,
        targetType: r.targetType,
        targetUserId: r.targetUserId,
        targetUser: r.targetUser,
        targetScheduleId: r.targetScheduleId,
        targetSchedule: r.targetSchedule,
      })),
      servicesCount: p._count.services,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Retrieves a single escalation policy by ID with all rule tiers.
   */
  async getEscalationPolicyById(id: string): Promise<EscalationPolicyDetail> {
    const policy = await prisma.escalationPolicy.findFirst({
      where: { id, deletedAt: null },
      include: {
        team: {
          select: { id: true, name: true, slug: true },
        },
        rules: {
          include: {
            targetUser: {
              select: { id: true, name: true, email: true },
            },
            targetSchedule: {
              select: { id: true, name: true },
            },
          },
          orderBy: { stepNumber: "asc" },
        },
        _count: {
          select: { services: { where: { deletedAt: null } } },
        },
      },
    });

    if (!policy) {
      throw new NotFoundError(`Escalation policy with ID ${id} not found`);
    }

    return {
      id: policy.id,
      name: policy.name,
      description: policy.description,
      teamId: policy.teamId,
      team: policy.team,
      rules: policy.rules.map((r) => ({
        id: r.id,
        stepNumber: r.stepNumber,
        delayMinutes: r.delayMinutes,
        targetType: r.targetType,
        targetUserId: r.targetUserId,
        targetUser: r.targetUser,
        targetScheduleId: r.targetScheduleId,
        targetSchedule: r.targetSchedule,
      })),
      servicesCount: policy._count.services,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }

  /**
   * Creates a new multi-tier escalation policy with rules in a transaction.
   */
  async createEscalationPolicy(data: CreateEscalationPolicyRequest) {
    if (data.teamId) {
      const team = await prisma.team.findFirst({
        where: { id: data.teamId, deletedAt: null },
      });
      if (!team) {
        throw new NotFoundError(`Team with ID ${data.teamId} not found`);
      }
    }

    // Verify all targets in rules
    for (const rule of data.rules) {
      if (rule.targetType === "USER" && !rule.targetUserId) {
        throw new BadRequestError(
          `Rule step ${rule.stepNumber} specifies USER target type but targetUserId is missing`,
        );
      }
      if (rule.targetType === "SCHEDULE" && !rule.targetScheduleId) {
        throw new BadRequestError(
          `Rule step ${rule.stepNumber} specifies SCHEDULE target type but targetScheduleId is missing`,
        );
      }
    }

    const created = await prisma.escalationPolicy.create({
      data: {
        name: data.name,
        description: data.description || null,
        teamId: data.teamId || null,
        rules: {
          create: data.rules.map((r) => ({
            stepNumber: r.stepNumber,
            delayMinutes: r.delayMinutes,
            targetType: r.targetType,
            targetUserId: r.targetUserId || null,
            targetScheduleId: r.targetScheduleId || null,
          })),
        },
      },
      include: {
        rules: {
          include: {
            targetUser: { select: { id: true, name: true, email: true } },
            targetSchedule: { select: { id: true, name: true } },
          },
          orderBy: { stepNumber: "asc" },
        },
      },
    });

    logger.info(
      { policyId: created.id, name: created.name },
      "Escalation policy created",
    );

    return {
      id: created.id,
      name: created.name,
      description: created.description,
      teamId: created.teamId,
      rules: created.rules.map((r) => ({
        id: r.id,
        stepNumber: r.stepNumber,
        delayMinutes: r.delayMinutes,
        targetType: r.targetType,
        targetUserId: r.targetUserId,
        targetUser: r.targetUser,
        targetScheduleId: r.targetScheduleId,
        targetSchedule: r.targetSchedule,
      })),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }
}

export const escalationPolicyService = new EscalationPolicyService();
