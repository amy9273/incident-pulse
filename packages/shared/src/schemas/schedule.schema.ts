import { z } from "zod";

export const ScheduleShiftSchema = z.object({
  id: z.string().uuid(),
  scheduleId: z.string().uuid(),
  userId: z.string().uuid(),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ScheduleShift = z.infer<typeof ScheduleShiftSchema>;

export const ScheduleDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  timeZone: z.string().default("UTC"),
  currentOnCallUser: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string(),
      shiftEnd: z.string(),
    })
    .nullable()
    .optional(),
  shifts: z.array(ScheduleShiftSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ScheduleDetail = z.infer<typeof ScheduleDetailSchema>;

export const CreateScheduleSchema = z.object({
  name: z.string().min(1, "Schedule name is required").max(100),
  description: z.string().max(500).optional(),
  timeZone: z.string().default("UTC"),
});

export type CreateScheduleRequest = z.infer<typeof CreateScheduleSchema>;

export const CreateShiftSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID"),
    startTime: z
      .string()
      .datetime({ message: "Invalid start time ISO format" }),
    endTime: z.string().datetime({ message: "Invalid end time ISO format" }),
  })
  .refine(
    (data) =>
      new Date(data.endTime).getTime() > new Date(data.startTime).getTime(),
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

export type CreateShiftRequest = z.infer<typeof CreateShiftSchema>;
