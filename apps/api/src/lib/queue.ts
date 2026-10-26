import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/env.js";

export const ESCALATION_QUEUE_NAME = "escalation-queue";

export interface EscalationJobData {
  incidentId: string;
  nextStepNumber: number;
  escalationPolicyId?: string;
}

// Dedicated BullMQ Redis connection factory
export const createQueueRedisConnection = () => {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 100, 3000);
    },
  });
};

export const escalationQueue = new Queue<EscalationJobData>(
  ESCALATION_QUEUE_NAME,
  {
    connection: createQueueRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  },
);

export const ESCALATION_DLQ_NAME = "escalation-dlq";

export interface EscalationDlqData extends EscalationJobData {
  failedReason?: string;
  failedAt: string;
  attemptsMade: number;
}

export const escalationDlq = new Queue<EscalationDlqData>(ESCALATION_DLQ_NAME, {
  connection: createQueueRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});
