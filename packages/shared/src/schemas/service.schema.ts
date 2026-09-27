import { z } from "zod";

export const EscalationRuleInputSchema = z.object({
  stepNumber: z.number().int().min(1, "Step number must be at least 1"),
  delayMinutes: z.number().int().min(1).max(1440).default(5),
  targetType: z.enum(["USER", "SCHEDULE"]),
  targetUserId: z.string().uuid("Invalid user ID").optional().nullable(),
  targetScheduleId: z
    .string()
    .uuid("Invalid schedule ID")
    .optional()
    .nullable(),
});

export type EscalationRuleInput = z.infer<typeof EscalationRuleInputSchema>;

export const CreateEscalationPolicySchema = z.object({
  name: z.string().min(1, "Policy name is required").max(100),
  description: z.string().max(500).optional(),
  teamId: z.string().uuid("Invalid team ID").optional().nullable(),
  rules: z
    .array(EscalationRuleInputSchema)
    .min(1, "At least one escalation rule tier is required"),
});

export type CreateEscalationPolicyRequest = z.infer<
  typeof CreateEscalationPolicySchema
>;

export const EscalationRuleResponseSchema = z.object({
  id: z.string().uuid(),
  stepNumber: z.number(),
  delayMinutes: z.number(),
  targetType: z.enum(["USER", "SCHEDULE"]),
  targetUserId: z.string().uuid().nullable().optional(),
  targetUser: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string(),
    })
    .nullable()
    .optional(),
  targetScheduleId: z.string().uuid().nullable().optional(),
  targetSchedule: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
    })
    .nullable()
    .optional(),
});

export type EscalationRuleResponse = z.infer<
  typeof EscalationRuleResponseSchema
>;

export const EscalationPolicyDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
  team: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
    })
    .nullable()
    .optional(),
  rules: z.array(EscalationRuleResponseSchema),
  servicesCount: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EscalationPolicyDetail = z.infer<
  typeof EscalationPolicyDetailSchema
>;

export const CreateServiceSchema = z.object({
  name: z.string().min(1, "Service name is required").max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase alphanumeric characters and hyphens",
    )
    .optional(),
  description: z.string().max(500).optional(),
  escalationPolicyId: z.string().uuid("Valid escalation policy ID is required"),
});

export type CreateServiceRequest = z.infer<typeof CreateServiceSchema>;

export const UpdateServiceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase alphanumeric characters and hyphens",
    )
    .optional(),
  description: z.string().max(500).optional().nullable(),
  escalationPolicyId: z.string().uuid().optional(),
});

export type UpdateServiceRequest = z.infer<typeof UpdateServiceSchema>;

export const ServiceListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  serviceKey: z.string(),
  escalationPolicyId: z.string().uuid(),
  escalationPolicy: z.object({
    id: z.string().uuid(),
    name: z.string(),
    rules: z.array(EscalationRuleResponseSchema).optional(),
  }),
  totalIncidents: z.number(),
  activeIncidents: z.number(),
  status: z.enum(["HEALTHY", "CRITICAL"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ServiceListItem = z.infer<typeof ServiceListItemSchema>;
