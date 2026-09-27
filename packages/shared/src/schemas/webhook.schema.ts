import { z } from "zod";
import { IncidentStatus, IncidentUrgency } from "../constants/status.js";

export const WebhookAlertSchema = z.object({
  title: z
    .string()
    .min(1, "Alert title is required")
    .max(255, "Alert title must not exceed 255 characters"),
  summary: z
    .string()
    .max(2000, "Summary must not exceed 2000 characters")
    .optional(),
  urgency: z
    .enum([IncidentUrgency.HIGH, IncidentUrgency.LOW])
    .default(IncidentUrgency.HIGH),
  fingerprint: z
    .string()
    .max(255, "Fingerprint must not exceed 255 characters")
    .optional(),
  payload: z.record(z.any()).optional(),
});

export type WebhookAlertRequest = z.infer<typeof WebhookAlertSchema>;

export const WebhookAlertResponseSchema = z.object({
  status: z.enum(["created", "deduplicated"]),
  incidentId: z.string().uuid(),
  alertCount: z.number().int().positive(),
  incident: z.object({
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
    fingerprint: z.string(),
    alertCount: z.number(),
    escalationStep: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export type WebhookAlertResponse = z.infer<typeof WebhookAlertResponseSchema>;
