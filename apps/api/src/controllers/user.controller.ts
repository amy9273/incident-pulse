import { Request, Response, NextFunction } from "express";
import { userService } from "../services/user.service.js";

export class UserController {
  async listUsers(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const users = await userService.listUsers();
      res.status(200).json({ users });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
