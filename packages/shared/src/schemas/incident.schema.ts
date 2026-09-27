import { z } from "zod";
import {
  IncidentStatus,
  IncidentUrgency,
  IncidentLogAction,
} from "../constants/status.js";

export const IncidentLogEntrySchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  actorId: z.string().uuid().nullable().optional(),
  action: z.enum([
    IncidentLogAction.TRIGGERED,
    IncidentLogAction.ACKNOWLEDGED,
    IncidentLogAction.RESOLVED,
    IncidentLogAction.ESCALATED,
    IncidentLogAction.REASSIGNED,
    IncidentLogAction.NOTE_ADDED,
    IncidentLogAction.NOTIFICATION_SENT,
  ]),
  message: z.string(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.string(),
});

export type IncidentLogEntry = z.infer<typeof IncidentLogEntrySchema>;

export const IncidentDetailSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  status: z.enum([
    IncidentStatus.TRIGGERED,
    IncidentStatus.ACKNOWLEDGED,
    IncidentStatus.RESOLVED,
  ]),
  urgency: z.enum([IncidentUrgency.HIGH, IncidentUrgency.LOW]),
  serviceId: z.string().uuid(),
  serviceName: z.string().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
  fingerprint: z.string(),
  escalationStep: z.number(),
  alertCount: z.number(),
  acknowledgedAt: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  payload: z.record(z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  logs: z.array(IncidentLogEntrySchema).optional(),
});

export type IncidentDetail = z.infer<typeof IncidentDetailSchema>;

export const IncidentListQuerySchema = z.object({
  status: z
    .enum([
      IncidentStatus.TRIGGERED,
      IncidentStatus.ACKNOWLEDGED,
      IncidentStatus.RESOLVED,
    ])
    .optional(),
  urgency: z.enum([IncidentUrgency.HIGH, IncidentUrgency.LOW]).optional(),
  serviceId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type IncidentListQuery = z.infer<typeof IncidentListQuerySchema>;

export const AcknowledgeIncidentSchema = z.object({
  note: z.string().max(1000).optional(),
});

export type AcknowledgeIncidentRequest = z.infer<
  typeof AcknowledgeIncidentSchema
>;

export const ResolveIncidentSchema = z.object({
  resolutionNotes: z.string().max(2000).optional(),
});

export type ResolveIncidentRequest = z.infer<typeof ResolveIncidentSchema>;
