import { Router } from "express";
import { WebhookAlertSchema } from "@incident-pulse/shared";
import { webhookController } from "../controllers/webhook.controller.js";
import { authenticateServiceKey } from "../middlewares/service-key.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const router = Router();

// Route 1: Key provided in URL path parameter
router.post(
  "/services/:serviceKey",
  authenticateServiceKey,
  validateBody(WebhookAlertSchema),
  webhookController.handleServiceWebhook.bind(webhookController),
);

// Route 2: Key provided via Authorization: Bearer <key> or x-service-key header
router.post(
  "/alert",
  authenticateServiceKey,
  validateBody(WebhookAlertSchema),
  webhookController.handleServiceWebhook.bind(webhookController),
);

export const webhookRouter = router;
