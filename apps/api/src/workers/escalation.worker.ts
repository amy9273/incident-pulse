import { Worker, Job } from "bullmq";
import { logger } from "../lib/logger.js";
import {
  ESCALATION_QUEUE_NAME,
  type EscalationJobData,
  createQueueRedisConnection,
  escalationQueue,
  escalationDlq,
} from "../lib/queue.js";
import { escalationService } from "../services/escalation.service.js";
import { prisma } from "../lib/prisma.js";
import { IncidentLogAction } from "@incident-pulse/shared";

export { ESCALATION_QUEUE_NAME, escalationQueue, escalationDlq };
export type { EscalationJobData };

export const createEscalationWorker = (): Worker<EscalationJobData> => {
  const connection = createQueueRedisConnection();
  const worker = new Worker<EscalationJobData>(
    ESCALATION_QUEUE_NAME,
    async (job: Job<EscalationJobData>) => {
      logger.info(
        {
          jobId: job.id,
          incidentId: job.data.incidentId,
          nextStepNumber: job.data.nextStepNumber,
          attempt: job.attemptsMade,
        },
        "⚡ BullMQ Escalation Worker processing delayed escalation step",
      );

      await escalationService.executeEscalationStep(
        job.data.incidentId,
        job.data.nextStepNumber,
      );
    },
    {
      connection,
      concurrency: 5,
      stalledInterval: 30000,
      maxStalledCount: 2,
    },
  );

  const originalClose = worker.close.bind(worker);
  worker.close = async (force?: boolean) => {
    await originalClose(force);
    await connection.quit().catch(() => connection.disconnect());
  };

  worker.on("completed", (job) => {
    logger.info(
      { jobId: job.id, incidentId: job.data.incidentId },
      "✅ Escalation job completed",
    );
  });

  worker.on("stalled", (jobId) => {
    logger.warn(
      { jobId },
      "⚠️ Escalation job stalled - BullMQ recovering execution",
    );
  });

  worker.on("error", (err) => {
    logger.error({ err: err.message }, "❌ Escalation worker connection error");
  });

  worker.on("failed", async (job, err) => {
    const attemptsMade = job?.attemptsMade ?? 1;
    const maxAttempts = job?.opts?.attempts ?? 5;
    const isExhausted = attemptsMade >= maxAttempts;

    logger.error(
      {
        jobId: job?.id,
        incidentId: job?.data.incidentId,
        error: err.message,
        attemptsMade,
        maxAttempts,
        isExhausted,
      },
      `❌ Escalation job failed (attempt ${attemptsMade}/${maxAttempts})`,
    );

    if (job && isExhausted) {
      try {
        await escalationDlq.add(`dlq_${job.id}`, {
          incidentId: job.data.incidentId,
          nextStepNumber: job.data.nextStepNumber,
          escalationPolicyId: job.data.escalationPolicyId,
          failedReason: err.message,
          failedAt: new Date().toISOString(),
          attemptsMade,
        });

        await prisma.incidentLog.create({
          data: {
            incidentId: job.data.incidentId,
            action: IncidentLogAction.ESCALATED,
            message: `Escalation step ${job.data.nextStepNumber} permanently failed after ${attemptsMade} attempts: ${err.message}`,
            metadata: {
              jobId: job.id,
              error: err.message,
              attemptsMade,
              movedToDlq: true,
            },
          },
        });

        logger.warn(
          { jobId: job.id, incidentId: job.data.incidentId },
          "📥 Exhausted escalation job captured in Dead Letter Queue (DLQ)",
        );
      } catch (dlqErr: unknown) {
        const errorMsg =
          dlqErr instanceof Error ? dlqErr.message : String(dlqErr);
        logger.error(
          { dlqErr: errorMsg, jobId: job.id },
          "Failed to process DLQ capture",
        );
      }
    }
  });

  return worker;
};
