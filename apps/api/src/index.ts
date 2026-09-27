import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { pool } from "./lib/db.js";
import { redis } from "./lib/redis.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    `🚀 IncidentPulse API running on port ${env.PORT} in ${env.NODE_ENV} mode`,
  );
  logger.info(`🩺 Liveness probe:  http://localhost:${env.PORT}/health/live`);
  logger.info(`🩺 Readiness probe: http://localhost:${env.PORT}/health/ready`);
});

// Graceful Shutdown Handling (Invariants & 12-Factor Best Practice)
const handleGracefulShutdown = async (signal: string) => {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info("HTTP server closed. Releasing resources...");

    try {
      await pool.end();
      logger.info("PostgreSQL pool drained and closed.");
    } catch (err) {
      logger.error({ err }, "Error closing PostgreSQL pool");
    }

    try {
      await redis.quit();
      logger.info("Redis client disconnected.");
    } catch (err) {
      logger.error({ err }, "Error disconnecting Redis");
    }

    logger.info("Graceful shutdown complete. Exiting.");
    process.exit(0);
  });

  // Force shutdown if cleanup takes longer than 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown: cleanup took too long");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
