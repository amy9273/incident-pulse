import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let redisInstance: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        logger.warn({ attempt: times, delay }, 'Reconnecting to Redis...');
        return delay;
      },
    });

    redisInstance.on('connect', () => {
      logger.info('🔗 Redis client connected');
    });

    redisInstance.on('ready', () => {
      logger.info('✅ Redis client ready for commands');
    });

    redisInstance.on('error', (err) => {
      logger.error({ err: err.message }, '❌ Redis connection error');
    });
  }

  return redisInstance;
};

export const redis = getRedisClient();
