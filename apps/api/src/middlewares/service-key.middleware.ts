import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { UnauthorizedError } from "../errors/index.js";
import { logger } from "../lib/logger.js";

/**
 * Middleware that validates an incoming Service API Key for machine-to-machine integrations (e.g., Webhook alert ingestion).
 * Accepts key from:
 * 1. Authorization: Bearer inc_live_... (Recommended)
 * 2. x-service-key: inc_live_... (Header)
 * 3. Route parameter: :serviceKey (Deprecated for security - CWE-598)
 */
export const authenticateServiceKey = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let serviceKey: string | undefined;
    let isViaUrlParam = false;

    // 1. Check Authorization Header (Bearer inc_live_...) - Preferred
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const [scheme, token] = authHeader.split(" ");
      if (scheme === "Bearer" && token) {
        serviceKey = token.trim();
      }
    }

    // 2. Fallback to custom x-service-key header
    if (!serviceKey && req.headers["x-service-key"]) {
      const headerVal = req.headers["x-service-key"];
      const rawKey = Array.isArray(headerVal) ? headerVal[0] : headerVal;
      if (rawKey) {
        serviceKey = rawKey.trim();
      }
    }

    // 3. Fallback to route param (:serviceKey) - Deprecated
    if (!serviceKey && req.params && req.params.serviceKey) {
      serviceKey = req.params.serviceKey.trim();
      isViaUrlParam = true;
    }

    if (!serviceKey) {
      throw new UnauthorizedError(
        "Service API key missing. Provide 'Authorization: Bearer inc_live_...' or 'x-service-key' header.",
      );
    }

    const service = await prisma.service.findFirst({
      where: {
        serviceKey,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        serviceKey: true,
        escalationPolicyId: true,
      },
    });

    if (!service) {
      throw new UnauthorizedError("Invalid or inactive service API key");
    }

    if (isViaUrlParam) {
      logger.warn(
        { path: req.path, serviceId: service.id },
        "Security Deprecation Warning: Passing API serviceKey via URL path parameter is deprecated (CWE-598). Use 'Authorization: Bearer <key>' or 'x-service-key' header instead.",
      );
    }

    req.service = service;
    next();
  } catch (error) {
    next(error);
  }
};
