import { seed } from "../src/seeds/seed.js";
import { prisma } from "../src/lib/prisma.js";
import { logger } from "../src/lib/logger.js";

seed()
  .catch((e) => {
    logger.error({ error: e }, "❌ Database seed failed");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
