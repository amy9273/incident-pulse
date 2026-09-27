import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load .env from monorepo root or current directory
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config(); // fallback to local .env if present

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid Redis connection URL"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  ESCALATION_DEFAULT_TIMEOUT_SEC: z.coerce.number().default(300),
  API_URL: z.string().default("http://localhost:5000"),
  WEB_URL: z.string().default("http://localhost:3000"),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
