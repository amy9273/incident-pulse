import {
  CreateScheduleRequest,
  CreateShiftRequest,
  ScheduleDetail,
  ScheduleShift,
} from "@incident-pulse/shared";
import { prisma } from "../lib/prisma.js";
import { NotFoundError } from "../errors/index.js";
import { logger } from "../lib/logger.js";

type ShiftWithUser = {
  id: string;
  scheduleId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type ScheduleWithShifts = {
  id: string;
  name: string;
  description: string | null;
  timeZone: string;
  createdAt: Date;
  updatedAt: Date;
  shifts: ShiftWithUser[];
};

export class ScheduleService {
  /**
   * Retrieves all schedules along with their active on-call user.
   */
  async listSchedules(): Promise<ScheduleDetail[]> {
    const now = new Date();

    const schedules = await prisma.schedule.findMany({
      where: { deletedAt: null },
      include: {
        shifts: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { startTime: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return (schedules as ScheduleWithShifts[]).map(
      (sch: ScheduleWithShifts) => {
        // Determine active on-call user
        const activeShift = sch.shifts.find(
          (s: ShiftWithUser) => s.startTime <= now && s.endTime >= now,
        );

        return {
          id: sch.id,
          name: sch.name,
          description: sch.description,
          timeZone: sch.timeZone,
          currentOnCallUser: activeShift
            ? {
                id: activeShift.user.id,
                name: activeShift.user.name,
                email: activeShift.user.email,
                shiftEnd: activeShift.endTime.toISOString(),
              }
            : null,
          shifts: sch.shifts.map((s: ShiftWithUser) => ({
            id: s.id,
            scheduleId: s.scheduleId,
            userId: s.userId,
            userName: s.user.name,
            userEmail: s.user.email,
            startTime: s.startTime.toISOString(),
            endTime: s.endTime.toISOString(),
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
          })),
          createdAt: sch.createdAt.toISOString(),
          updatedAt: sch.updatedAt.toISOString(),
        };
      },
    );
  }

  /**
   * Retrieves a schedule by ID with shifts within a date window.
   */
  async getScheduleById(
    id: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ScheduleDetail> {
    const now = new Date();

    const schedule = await prisma.schedule.findUnique({
      where: { id, deletedAt: null },
      include: {
        shifts: {
          where: {
            ...(startDate || endDate
              ? {
                  AND: [
                    startDate ? { endTime: { gte: startDate } } : {},
                    endDate ? { startTime: { lte: endDate } } : {},
                  ],
                }
              : {}),
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { startTime: "asc" },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundError(`Schedule with ID ${id} not found`);
    }

    const sch = schedule as ScheduleWithShifts;

    const activeShift = sch.shifts.find(
      (s: ShiftWithUser) => s.startTime <= now && s.endTime >= now,
    );

    return {
      id: sch.id,
      name: sch.name,
      description: sch.description,
      timeZone: sch.timeZone,
      currentOnCallUser: activeShift
        ? {
            id: activeShift.user.id,
            name: activeShift.user.name,
            email: activeShift.user.email,
            shiftEnd: activeShift.endTime.toISOString(),
          }
        : null,
      shifts: sch.shifts.map((s: ShiftWithUser) => ({
        id: s.id,
        scheduleId: s.scheduleId,
        userId: s.userId,
        userName: s.user.name,
        userEmail: s.user.email,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      createdAt: sch.createdAt.toISOString(),
      updatedAt: sch.updatedAt.toISOString(),
    };
  }

  /**
   * Creates a new schedule.
   */
  async createSchedule(data: CreateScheduleRequest): Promise<ScheduleDetail> {
    const created = await prisma.schedule.create({
      data: {
        name: data.name,
        description: data.description,
        timeZone: data.timeZone || "UTC",
      },
      include: {
        shifts: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    logger.info(
      { scheduleId: created.id, name: created.name },
      "Schedule created",
    );

    return {
      id: created.id,
      name: created.name,
      description: created.description,
      timeZone: created.timeZone,
      currentOnCallUser: null,
      shifts: [],
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Adds a shift to a schedule.
   */
  async addShift(
    scheduleId: string,
    data: CreateShiftRequest,
  ): Promise<ScheduleShift> {
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId, deletedAt: null },
    });

    if (!schedule) {
      throw new NotFoundError(`Schedule with ID ${scheduleId} not found`);
    }

    const user = await prisma.user.findUnique({
      where: { id: data.userId, deletedAt: null },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new NotFoundError(`User with ID ${data.userId} not found`);
    }

    const shift = await prisma.scheduleShift.create({
      data: {
        scheduleId,
        userId: data.userId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    logger.info(
      { shiftId: shift.id, scheduleId, userId: data.userId },
      "Schedule shift created",
    );

    return {
      id: shift.id,
      scheduleId: shift.scheduleId,
      userId: shift.userId,
      userName: shift.user.name,
      userEmail: shift.user.email,
      startTime: shift.startTime.toISOString(),
      endTime: shift.endTime.toISOString(),
      createdAt: shift.createdAt.toISOString(),
      updatedAt: shift.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes a shift from a schedule.
   */
  async deleteShift(scheduleId: string, shiftId: string): Promise<void> {
    const shift = await prisma.scheduleShift.findFirst({
      where: { id: shiftId, scheduleId },
    });

    if (!shift) {
      throw new NotFoundError(
        `Shift with ID ${shiftId} not found in schedule ${scheduleId}`,
      );
    }

    await prisma.scheduleShift.delete({
      where: { id: shiftId },
    });

    logger.info({ shiftId, scheduleId }, "Schedule shift deleted");
  }
}

export const scheduleService = new ScheduleService();
