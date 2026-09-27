import { after } from "node:test";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { escalationQueue } from "../lib/queue.js";

// Import all test suites to run sequentially in a single process
import "./health.test.js";
import "./prisma.test.js";
import "./auth.test.js";
import "./webhook.test.js";
import "./escalation.test.js";
import "./socket.test.js";

// Global teardown to cleanly close all persistent singleton connections
after(async () => {
  await escalationQueue.close();
  await prisma.$disconnect();
  redis.disconnect();
  // Ensure clean exit without hanging event loop handles
  setTimeout(() => process.exit(0), 100);
});
