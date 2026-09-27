import { Router } from "express";
import { serviceController } from "../controllers/service.controller.js";
import {
  authenticateJwt,
  requireRole,
} from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import {
  CreateServiceSchema,
  UpdateServiceSchema,
  UserRole,
} from "@incident-pulse/shared";

export const serviceRouter = Router();

// All service routes require authenticated user session
serviceRouter.use(authenticateJwt);

serviceRouter.get("/", serviceController.listServices);
serviceRouter.get("/:id", serviceController.getServiceById);

serviceRouter.post(
  "/",
  requireRole([UserRole.ADMIN]),
  validateBody(CreateServiceSchema),
  serviceController.createService,
);

serviceRouter.put(
  "/:id",
  requireRole([UserRole.ADMIN]),
  validateBody(UpdateServiceSchema),
  serviceController.updateService,
);

serviceRouter.post(
  "/:id/rotate-key",
  requireRole([UserRole.ADMIN]),
  serviceController.rotateServiceKey,
);

serviceRouter.delete(
  "/:id",
  requireRole([UserRole.ADMIN]),
  serviceController.deleteService,
);
