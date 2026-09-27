import { Worker, Job } from "bullmq";
import { logger } from "../lib/logger.js";
import {
  ESCALATION_QUEUE_NAME,
  type EscalationJobData,
  createQueueRedisConnection,
  escalationQueue,
} from "../lib/queue.js";
import { escalationService } from "../services/escalation.service.js";

export { ESCALATION_QUEUE_NAME, escalationQueue };
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
    },
  );

  const originalClose = worker.close.bind(worker);
  worker.close = async (force?: boolean) => {
    await originalClose(force);
    connection.disconnect();
  };

  worker.on("completed", (job) => {
    logger.info(
      { jobId: job.id, incidentId: job.data.incidentId },
      "✅ Escalation job completed",
    );
  });

  worker.on("failed", (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        incidentId: job?.data.incidentId,
        error: err.message,
      },
      "❌ Escalation job failed",
    );
  });

  return worker;
};
