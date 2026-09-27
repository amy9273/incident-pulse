import { Request, Response, NextFunction } from "express";
import { scheduleService } from "../services/schedule.service.js";

export class ScheduleController {
  async listSchedules(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const schedules = await scheduleService.listSchedules();
      res.status(200).json({ schedules });
    } catch (err) {
      next(err);
    }
  }

  async getScheduleById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { start, end } = req.query;

      const startDate = start ? new Date(start as string) : undefined;
      const endDate = end ? new Date(end as string) : undefined;

      const schedule = await scheduleService.getScheduleById(
        id as string,
        startDate,
        endDate,
      );
      res.status(200).json({ schedule });
    } catch (err) {
      next(err);
    }
  }

  async createSchedule(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const schedule = await scheduleService.createSchedule(req.body);
      res.status(201).json({ schedule });
    } catch (err) {
      next(err);
    }
  }

  async addShift(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const shift = await scheduleService.addShift(id as string, req.body);
      res.status(201).json({ shift });
    } catch (err) {
      next(err);
    }
  }

  async deleteShift(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id, shiftId } = req.params;
      await scheduleService.deleteShift(id as string, shiftId as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export const scheduleController = new ScheduleController();
