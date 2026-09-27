import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";
import { AppError } from "../errors/index.js";

export const errorMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const correlationId = req.headers["x-correlation-id"];

  let statusCode = 500;
  let message = "Internal Server Error";
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    details = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
  } else if (err instanceof SyntaxError && "body" in err) {
    // Malformed JSON body
    statusCode = 400;
    message = "Malformed JSON payload";
  } else {
    // Unhandled exception
    message =
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error";
  }

  logger.error(
    {
      correlationId,
      statusCode,
      err: err.stack || err.message,
      path: req.path,
      method: req.method,
      details,
    },
    "Request error handled",
  );

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      correlationId,
      ...(details ? { details } : {}),
    },
  });
};
