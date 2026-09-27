import { Router } from "express";
import { LoginRequestSchema } from "@incident-pulse/shared";
import { authController } from "../controllers/auth.controller.js";
import { authenticateJwt } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const router = Router();

router.post(
  "/login",
  validateBody(LoginRequestSchema),
  authController.login.bind(authController),
);

router.get("/me", authenticateJwt, authController.me.bind(authController));

export const authRouter = router;
