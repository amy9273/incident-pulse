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
  });
};

export const escalationQueue = new Queue<EscalationJobData>(
  ESCALATION_QUEUE_NAME,
  {
    connection: createQueueRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
    },
  },
);
