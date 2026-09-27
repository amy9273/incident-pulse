import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { UnauthorizedError } from "../errors/index.js";

/**
 * Middleware that validates an incoming Service API Key for machine-to-machine integrations (e.g., Webhook alert ingestion).
 * Accepts key from:
 * 1. Authorization: Bearer inc_live_...
 * 2. x-service-key: inc_live_...
 * 3. Route parameter: :serviceKey (e.g., /api/v1/webhooks/services/:serviceKey)
 */
export const authenticateServiceKey = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let serviceKey: string | undefined;

    // 1. Check Authorization Header (Bearer inc_live_...)
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

    // 3. Fallback to route param (:serviceKey)
    if (!serviceKey && req.params && req.params.serviceKey) {
      serviceKey = req.params.serviceKey.trim();
    }

    if (!serviceKey) {
      throw new UnauthorizedError(
        "Service API key missing. Provide 'Authorization: Bearer inc_live_...', 'x-service-key', or ':serviceKey' route parameter.",
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

    req.service = service;
    next();
  } catch (error) {
    next(error);
  }
};
