import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticateJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateJwt);

router.get("/", (req, res, next) => userController.listUsers(req, res, next));

export const userRouter = router;
