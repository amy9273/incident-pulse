import { Request, Response, NextFunction } from "express";
import { alertIngestionService } from "../services/alert-ingestion.service.js";
import { UnauthorizedError } from "../errors/index.js";

export class WebhookController {
  /**
   * Handles incoming webhook alert payloads for a service.
   * Responds with 201 Created for new incidents or 200 OK for deduplicated incidents.
   */
  async handleServiceWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.service) {
        throw new UnauthorizedError(
          "Service authentication required. Provide valid service API key.",
        );
      }

      const result = await alertIngestionService.ingestAlert(
        req.service,
        req.body,
      );

      const statusCode = result.status === "created" ? 201 : 200;
      res.status(statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const webhookController = new WebhookController();
