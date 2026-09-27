import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { escalationService } from "../services/escalation.service.js";

export const ESCALATION_QUEUE_NAME = "escalation-queue";

export interface EscalationJobData {
  incidentId: string;
  nextStepNumber: number;
  escalationPolicyId?: string;
}

// Dedicated BullMQ Redis connection
const createRedisConnection = () => {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
};

export const escalationQueue = new Queue<EscalationJobData>(
  ESCALATION_QUEUE_NAME,
  {
    connection: createRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
    },
  },
);

export const createEscalationWorker = (): Worker<EscalationJobData> => {
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
      connection: createRedisConnection(),
      concurrency: 5,
    },
  );

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
