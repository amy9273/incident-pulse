import { Router } from "express";
import { escalationPolicyController } from "../controllers/escalation-policy.controller.js";
import {
  authenticateJwt,
  requireRole,
} from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { CreateEscalationPolicySchema, UserRole } from "@incident-pulse/shared";

export const escalationPolicyRouter = Router();

// All escalation policy routes require authenticated user session
escalationPolicyRouter.use(authenticateJwt);

escalationPolicyRouter.get(
  "/",
  escalationPolicyController.listEscalationPolicies,
);
escalationPolicyRouter.get(
  "/:id",
  escalationPolicyController.getEscalationPolicyById,
);

escalationPolicyRouter.post(
  "/",
  requireRole([UserRole.ADMIN]),
  validateBody(CreateEscalationPolicySchema),
  escalationPolicyController.createEscalationPolicy,
);
