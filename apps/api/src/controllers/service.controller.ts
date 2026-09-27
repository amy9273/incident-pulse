import { Request, Response, NextFunction } from "express";
import { serviceService } from "../services/service.service.js";

export class ServiceController {
  async listServices(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const services = await serviceService.listServices();
      res.status(200).json({ services });
    } catch (err) {
      next(err);
    }
  }

  async getServiceById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const service = await serviceService.getServiceById(id as string);
      res.status(200).json({ service });
    } catch (err) {
      next(err);
    }
  }

  async createService(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const service = await serviceService.createService(req.body);
      res.status(201).json({ service });
    } catch (err) {
      next(err);
    }
  }

  async updateService(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const service = await serviceService.updateService(
        id as string,
        req.body,
      );
      res.status(200).json({ service });
    } catch (err) {
      next(err);
    }
  }

  async rotateServiceKey(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const result = await serviceService.rotateServiceKey(id as string);
      res.status(200).json({ service: result });
    } catch (err) {
      next(err);
    }
  }

  async deleteService(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      await serviceService.deleteService(id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export const serviceController = new ServiceController();
