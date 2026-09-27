import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const correlationId = req.headers["x-correlation-id"];
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";

  logger.error(
    {
      correlationId,
      statusCode,
      err: err.stack || err.message,
      path: req.path,
      method: req.method,
    },
    "Request error",
  );

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      correlationId,
    },
  });
};
