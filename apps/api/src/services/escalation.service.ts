import { Prisma } from "@prisma/client";
import {
  EscalationTargetType,
  IncidentLogAction,
  IncidentStatus,
} from "@incident-pulse/shared";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";
import { escalationQueue } from "../workers/escalation.worker.js";

export interface TargetRuleConfig {
  targetType: EscalationTargetType;
  targetUserId?: string | null;
  targetScheduleId?: string | null;
}

export class EscalationService {
  /**
   * Resolves the target engineer for a given escalation rule.
   * If USER, returns user directly.
   * If SCHEDULE, queries currently active shift window.
   */
  async resolveTarget(rule: TargetRuleConfig, atTime: Date = new Date()) {
    if (rule.targetType === EscalationTargetType.USER && rule.targetUserId) {
      return await prisma.user.findFirst({
        where: { id: rule.targetUserId, deletedAt: null },
      });
    }

    if (
      rule.targetType === EscalationTargetType.SCHEDULE &&
      rule.targetScheduleId
    ) {
      // Find shift covering current timestamp
      const activeShift = await prisma.scheduleShift.findFirst({
        where: {
          scheduleId: rule.targetScheduleId,
          startTime: { lte: atTime },
          endTime: { gte: atTime },
        },
        include: { user: true },
        orderBy: { startTime: "asc" },
      });

      if (activeShift?.user && !activeShift.user.deletedAt) {
        return activeShift.user;
      }

      // Fallback: any upcoming or existing shift for schedule
      const fallbackShift = await prisma.scheduleShift.findFirst({
        where: { scheduleId: rule.targetScheduleId },
        include: { user: true },
        orderBy: { startTime: "desc" },
      });

      if (fallbackShift?.user && !fallbackShift.user.deletedAt) {
        return fallbackShift.user;
      }
    }

    return null;
  }

  /**
   * Starts the initial escalation tier assignment and schedules the next tier delay.
   */
  async startEscalationForIncident(incidentId: string): Promise<void> {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        service: {
          include: {
            escalationPolicy: {
              include: {
                rules: {
                  orderBy: { stepNumber: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!incident || !incident.service.escalationPolicy) {
      return;
    }

    const rules = incident.service.escalationPolicy.rules;
    if (rules.length === 0) {
      return;
    }

    const step1Rule = rules[0];
    if (step1Rule) {
      // 1. Resolve initial target and assign
      const targetUser = await this.resolveTarget(step1Rule);

      if (targetUser && !incident.assigneeId) {
        await prisma.incident.update({
          where: { id: incident.id },
          data: { assigneeId: targetUser.id },
        });

        await prisma.incidentLog.create({
          data: {
            incidentId: incident.id,
            action: IncidentLogAction.REASSIGNED,
            message: `Assigned to Tier 1 on-call responder: ${targetUser.name}`,
            actorId: targetUser.id,
          },
        });
      }

      // 2. Schedule Step 2 if policy has more than 1 tier
      if (rules.length > 1) {
        const delaySeconds =
          env.NODE_ENV === "test"
            ? env.ESCALATION_DEFAULT_TIMEOUT_SEC
            : step1Rule.delayMinutes * 60;

        await this.scheduleEscalationStep(incident.id, 2, delaySeconds * 1000);
      }
    }
  }

  /**
   * Schedules a delayed BullMQ job to execute a specific escalation tier.
   */
  async scheduleEscalationStep(
    incidentId: string,
    nextStepNumber: number,
    delayMs: number,
  ): Promise<void> {
    const jobId = `escalation:${incidentId}:step:${nextStepNumber}`;

    await escalationQueue.add(
      "escalate",
      {
        incidentId,
        nextStepNumber,
      },
      {
        jobId,
        delay: delayMs,
        removeOnComplete: true,
      },
    );

    logger.info(
      { incidentId, nextStepNumber, delayMs, jobId },
      `⏱️ Scheduled BullMQ delayed escalation to Step ${nextStepNumber} in ${delayMs / 1000}s`,
    );
  }

  /**
   * Executes an auto-escalation step when a delayed BullMQ timer expires.
   * Invariant #1 (Deterministic state machine) & Invariant #3 (Atomic transaction).
   */
  async executeEscalationStep(
    incidentId: string,
    targetStepNumber: number,
  ): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Re-query incident state
      const incident = await tx.incident.findUnique({
        where: { id: incidentId },
        include: {
          service: {
            include: {
              escalationPolicy: {
                include: {
                  rules: {
                    orderBy: { stepNumber: "asc" },
                  },
                },
              },
            },
          },
        },
      });

      // 2. If incident was already acknowledged or resolved, abort escalation
      if (!incident || incident.status !== IncidentStatus.TRIGGERED) {
        logger.info(
          { incidentId, status: incident?.status },
          "Escalation aborted: Incident is no longer in TRIGGERED status",
        );
        return;
      }

      const rules = incident.service.escalationPolicy.rules;
      const targetRule = rules.find((r) => r.stepNumber === targetStepNumber);

      if (!targetRule) {
        logger.info(
          { incidentId, targetStepNumber },
          "Escalation completed: Reached max policy tier",
        );
        return;
      }

      // 3. Resolve target user for this step
      const targetUser = await this.resolveTarget(targetRule);

      // 4. Update incident status and escalationStep
      const updatedIncident = await tx.incident.update({
        where: { id: incident.id },
        data: {
          escalationStep: targetStepNumber,
          assigneeId: targetUser?.id ?? incident.assigneeId,
        },
      });

      // 5. Append immutable IncidentLog
      await tx.incidentLog.create({
        data: {
          incidentId: incident.id,
          action: IncidentLogAction.ESCALATED,
          message: `Auto-escalated to Tier ${targetStepNumber}${targetUser ? ` (${targetUser.name})` : ""}`,
          actorId: targetUser?.id ?? null,
          metadata: {
            previousStep: incident.escalationStep,
            newStep: targetStepNumber,
            targetType: targetRule.targetType,
          },
        },
      });

      logger.warn(
        {
          incidentId: updatedIncident.id,
          newStep: targetStepNumber,
          assigneeId: updatedIncident.assigneeId,
        },
        `🚨 Incident auto-escalated to Step ${targetStepNumber}`,
      );

      // 6. Schedule next step if available
      const subsequentRule = rules.find(
        (r) => r.stepNumber === targetStepNumber + 1,
      );

      if (subsequentRule) {
        const delaySeconds =
          env.NODE_ENV === "test"
            ? env.ESCALATION_DEFAULT_TIMEOUT_SEC
            : targetRule.delayMinutes * 60;

        // Schedule outside of tx or after tx commits
        setImmediate(async () => {
          await this.scheduleEscalationStep(
            incident.id,
            targetStepNumber + 1,
            delaySeconds * 1000,
          );
        });
      }
    });
  }

  /**
   * Cancels any pending delayed BullMQ jobs for an incident when acknowledged or resolved.
   */
  async cancelEscalation(incidentId: string): Promise<void> {
    try {
      const delayedJobs = await escalationQueue.getDelayed();
      for (const job of delayedJobs) {
        if (job.data.incidentId === incidentId) {
          await job.remove();
          logger.info(
            { jobId: job.id, incidentId },
            "🗑️ Removed pending BullMQ escalation timer job",
          );
        }
      }
    } catch (error) {
      logger.warn(
        { incidentId, error: (error as Error).message },
        "Warning: Failed to scan/remove delayed escalation job",
      );
    }
  }
}

export const escalationService = new EscalationService();
