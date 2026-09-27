import { Request, Response, NextFunction } from "express";
import { escalationPolicyService } from "../services/escalation-policy.service.js";

export class EscalationPolicyController {
  async listEscalationPolicies(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policies = await escalationPolicyService.listEscalationPolicies();
      res.status(200).json({ policies });
    } catch (err) {
      next(err);
    }
  }

  async getEscalationPolicyById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const policy = await escalationPolicyService.getEscalationPolicyById(
        id as string,
      );
      res.status(200).json({ policy });
    } catch (err) {
      next(err);
    }
  }

  async createEscalationPolicy(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const policy = await escalationPolicyService.createEscalationPolicy(
        req.body,
      );
      res.status(201).json({ policy });
    } catch (err) {
      next(err);
    }
  }
}

export const escalationPolicyController = new EscalationPolicyController();
