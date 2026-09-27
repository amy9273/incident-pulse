import { Router } from "express";
import {
  AcknowledgeIncidentSchema,
  IncidentListQuerySchema,
  ResolveIncidentSchema,
} from "@incident-pulse/shared";
import { incidentController } from "../controllers/incident.controller.js";
import { authenticateJwt } from "../middlewares/auth.middleware.js";
import {
  validateBody,
  validateQuery,
} from "../middlewares/validate.middleware.js";

const router = Router();

// Protect all incident endpoints with JWT auth
router.use(authenticateJwt);

router.get(
  "/",
  validateQuery(IncidentListQuerySchema),
  incidentController.list.bind(incidentController),
);

router.get("/:id", incidentController.getById.bind(incidentController));

router.post(
  "/:id/acknowledge",
  validateBody(AcknowledgeIncidentSchema),
  incidentController.acknowledge.bind(incidentController),
);

router.post(
  "/:id/resolve",
  validateBody(ResolveIncidentSchema),
  incidentController.resolve.bind(incidentController),
);

export const incidentRouter = router;
