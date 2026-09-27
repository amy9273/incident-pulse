import express from "express";
import helmet from "helmet";
import cors from "cors";
import { correlationMiddleware } from "./middlewares/correlation.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { webhookRouter } from "./routes/webhook.routes.js";
import { incidentRouter } from "./routes/incident.routes.js";
import { scheduleRouter } from "./routes/schedule.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { serviceRouter } from "./routes/service.routes.js";
import { escalationPolicyRouter } from "./routes/escalation-policy.routes.js";
import { docsRouter } from "./routes/docs.routes.js";
import { env } from "./config/env.js";

export const createApp = () => {
  const app = express();

  // 1. Security Headers & CORS
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow native mobile apps, curl, server-to-server (origin is undefined)
        if (!origin) return callback(null, true);
        // Allow configured web URL or any localhost / 127.0.0.1 port (Next.js on 3000, Flutter web on Chrome)
        if (
          origin === env.WEB_URL ||
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    }),
  );

  // 2. Request Parsing & Context
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(correlationMiddleware);

  // 3. Health & Status Probes
  app.use("/health", healthRouter);

  // 4. API v1 Routes
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/webhooks", webhookRouter);
  app.use("/api/v1/incidents", incidentRouter);
  app.use("/api/v1/schedules", scheduleRouter);
  app.use("/api/v1/users", userRouter);
  app.use("/api/v1/services", serviceRouter);
  app.use("/api/v1/escalation-policies", escalationPolicyRouter);
  app.use("/api/v1/docs", docsRouter);

  // 5. Root Welcome Route
  app.get("/", (_req, res) => {
    res.json({
      name: "IncidentPulse API",
      version: "0.1.0",
      status: "operational",
      docs: "/api/v1/docs",
    });
  });

  // 6. Centralized Error Middleware (Must be last)
  app.use(errorMiddleware);

  return app;
};
