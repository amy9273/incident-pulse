/**
 * IncidentPulse — Automated Cloud Database Keepalive Ping Script
 *
 * Prevents free-tier database deletion (Redis Cloud inactivity deletion policy
 * and Neon PostgreSQL auto-archival) by performing lightweight read/write heartbeats.
 */

import { Redis } from "ioredis";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../apps/api/.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const redisUrl =
  process.env.REDIS_URL ||
  "redis://default:2MlpHoYSdKphNrkoY5hHqtO0u4oy2hQL@cattle-ring-neosleek-18395.db.redis.io:13215";
const databaseUrl = process.env.DATABASE_URL;

async function runKeepalive() {
  console.log("💓 Starting IncidentPulse Cloud Keepalive Ping...");
  const startTime = Date.now();

  // 1. Redis Heartbeat (Prevents Redis Cloud free-tier 14-day inactivity deletion)
  console.log("📡 Connecting to Redis Cloud...");
  const redis = new Redis(redisUrl, {
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

  try {
    const pong = await redis.ping();
    const timestamp = new Date().toISOString();
    await redis.set("keepalive:heartbeat", timestamp, "EX", 60 * 60 * 24 * 30);
    const stored = await redis.get("keepalive:heartbeat");

    console.log(`✅ Redis Cloud Active: PING -> ${pong}`);
    console.log(`📝 Redis Heartbeat Registered: ${stored}`);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`❌ Redis Cloud Heartbeat Failed: ${errorMessage}`);
    process.exitCode = 1;
  } finally {
    redis.disconnect();
  }

  // 2. PostgreSQL Heartbeat (Prevents Neon serverless auto-archival)
  if (databaseUrl) {
    console.log("🐘 Connecting to Neon PostgreSQL...");
    const prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });

    try {
      await prisma.$queryRaw`SELECT 1 as ping`;
      console.log("✅ Neon PostgreSQL Active: Connection verified");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`❌ Neon PostgreSQL Heartbeat Failed: ${errorMessage}`);
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  }

  const duration = Date.now() - startTime;
  console.log(
    `✨ Keepalive completed in ${duration}ms with exit code ${process.exitCode || 0}`,
  );
}

runKeepalive().catch((err) => {
  console.error("Fatal keepalive error:", err);
  process.exit(1);
});
