import { Request, Response, NextFunction } from "express";
import { incidentService } from "../services/incident.service.js";
import { UnauthorizedError } from "../errors/index.js";
import { IncidentListQuery } from "@incident-pulse/shared";

export class IncidentController {
  /**
   * GET /api/v1/incidents
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await incidentService.listIncidents(
        req.query as unknown as IncidentListQuery,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/incidents/:id
   */
  async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const incident = await incidentService.getIncidentById(
        req.params.id as string,
      );
      res.status(200).json({ incident });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/incidents/:id/acknowledge
   */
  async acknowledge(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }

      const note = req.body?.note;
      const incident = await incidentService.acknowledgeIncident(
        req.params.id as string,
        req.user,
        note,
      );

      res.status(200).json({ incident });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/incidents/:id/resolve
   */
  async resolve(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }

      const resolutionNotes = req.body?.resolutionNotes;
      const incident = await incidentService.resolveIncident(
        req.params.id as string,
        req.user,
        resolutionNotes,
      );

      res.status(200).json({ incident });
    } catch (error) {
      next(error);
    }
  }
}

export const incidentController = new IncidentController();
