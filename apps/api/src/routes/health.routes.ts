import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

export const healthRouter = Router();

/**
 * Liveness Probe (GET /health/live)
 * Answers: Is the process running and event loop unblocked?
 * INVARIANT: NEVER check DB or Redis here (prevents cascading restart loops).
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
});

/**
 * Readiness Probe (GET /health/ready)
 * Answers: Are backing services (PostgreSQL & Redis) reachable and responsive?
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const checks: {
    database: { status: 'healthy' | 'unhealthy'; latencyMs?: number; error?: string };
    redis: { status: 'healthy' | 'unhealthy'; latencyMs?: number; error?: string };
  } = {
    database: { status: 'unhealthy' },
    redis: { status: 'unhealthy' },
  };

  let allHealthy = true;

  // 1. Check PostgreSQL
  const dbStart = Date.now();
  try {
    await pool.query('SELECT 1;');
    checks.database = {
      status: 'healthy',
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    allHealthy = false;
    const msg = error instanceof Error ? error.message : 'Database check failed';
    checks.database = { status: 'unhealthy', error: msg };
    logger.error({ error: msg }, 'Readiness check failed for PostgreSQL');
  }

  // 2. Check Redis
  const redisStart = Date.now();
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    const pingResult = await redis.ping();
    if (pingResult === 'PONG') {
      checks.redis = {
        status: 'healthy',
        latencyMs: Date.now() - redisStart,
      };
    } else {
      throw new Error(`Unexpected Redis ping response: ${pingResult}`);
    }
  } catch (error) {
    allHealthy = false;
    const msg = error instanceof Error ? error.message : 'Redis check failed';
    checks.redis = { status: 'unhealthy', error: msg };
    logger.error({ error: msg }, 'Readiness check failed for Redis');
  }

  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
  });
});
