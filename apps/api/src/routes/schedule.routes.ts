import { Router } from "express";
import { scheduleController } from "../controllers/schedule.controller.js";
import { authenticateJwt } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import {
  CreateScheduleSchema,
  CreateShiftSchema,
} from "@incident-pulse/shared";

const router = Router();

// Protect all schedule routes
router.use(authenticateJwt);

router.get("/", (req, res, next) =>
  scheduleController.listSchedules(req, res, next),
);

router.post("/", validateBody(CreateScheduleSchema), (req, res, next) =>
  scheduleController.createSchedule(req, res, next),
);

router.get("/:id", (req, res, next) =>
  scheduleController.getScheduleById(req, res, next),
);

router.post("/:id/shifts", validateBody(CreateShiftSchema), (req, res, next) =>
  scheduleController.addShift(req, res, next),
);

router.delete("/:id/shifts/:shiftId", (req, res, next) =>
  scheduleController.deleteShift(req, res, next),
);

export const scheduleRouter = router;
