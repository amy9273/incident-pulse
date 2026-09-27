import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { requestContext } from "../utils/context.js";

export const correlationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const correlationId =
    (req.headers["x-correlation-id"] as string) || crypto.randomUUID();
  req.headers["x-correlation-id"] = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);

  requestContext.run({ correlationId }, () => {
    next();
  });
};
