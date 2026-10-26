import { Request, Response, NextFunction } from "express";
import { TooManyRequestsError } from "../errors/index.js";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

const stores = new Map<string, Map<string, ClientRecord>>();

/**
 * Periodically purge expired rate limit records to prevent memory growth.
 * Uses unref() so the interval does not prevent Node from exiting cleanly.
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }
}, 60 * 1000);
cleanupInterval.unref();

export const resetRateLimits = (): void => {
  for (const store of stores.values()) {
    store.clear();
  }
};

/**
 * In-memory sliding fixed-window rate limiter middleware.
 * Sets standard RateLimit headers and throws TooManyRequestsError (HTTP 429) on breach.
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const storeId = `${options.windowMs}_${options.max}`;
  if (!stores.has(storeId)) {
    stores.set(storeId, new Map<string, ClientRecord>());
  }
  const store = stores.get(storeId)!;

  const defaultKeyGenerator = (req: Request): string => {
    return (
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      "unknown-ip"
    );
  };

  const keyGenerator = options.keyGenerator || defaultKeyGenerator;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    let record = store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      store.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, options.max - record.count);
    const resetSeconds = Math.ceil(record.resetTime / 1000);

    res.setHeader("RateLimit-Limit", options.max);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", resetSeconds);

    if (record.count > options.max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((record.resetTime - now) / 1000),
      );
      res.setHeader("Retry-After", retryAfterSeconds);
      return next(
        new TooManyRequestsError(
          options.message || "Too many requests. Please try again later.",
        ),
      );
    }

    next();
  };
};

/**
 * Rate limiter for Authentication endpoints (e.g., /api/v1/auth/login)
 * 15 requests per 1-minute window per IP.
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: "Too many login attempts. Please try again after 60 seconds.",
});

/**
 * Rate limiter for Alert Webhook Ingestion endpoints (e.g., /api/v1/webhooks)
 * 120 requests per 1-minute window per service key/IP.
 */
export const webhookRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req: Request): string => {
    return (
      req.service?.serviceKey ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      "unknown-webhook-caller"
    );
  },
  message: "Too many webhook requests. Please try again later.",
});
