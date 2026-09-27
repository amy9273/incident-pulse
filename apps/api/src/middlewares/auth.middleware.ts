import { Request, Response, NextFunction } from "express";
import { UserRole } from "@incident-pulse/shared";
import { authService } from "../services/auth.service.js";
import { ForbiddenError, UnauthorizedError } from "../errors/index.js";

/**
 * Middleware that validates the JWT Bearer token in the Authorization header.
 * Attaches the authenticated user payload to req.user.
 */
export const authenticateJwt = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError("Authorization header is missing");
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedError(
        "Invalid authorization format. Expected 'Bearer <token>'",
      );
    }

    const payload = authService.verifyToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware generator enforcing Role-Based Access Control (RBAC).
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: Requires one of [${allowedRoles.join(", ")}] roles`,
        ),
      );
    }

    next();
  };
};
