import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service.js";
import { UnauthorizedError } from "../errors/index.js";

export class AuthController {
  /**
   * POST /api/v1/auth/login
   * Authenticates user and returns JWT token + user profile.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   * Returns current authenticated user profile.
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }

      const user = await authService.getUserById(req.user.id);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
