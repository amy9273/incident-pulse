export const UserRole = {
  ADMIN: "ADMIN",
  RESPONDER: "RESPONDER",
  VIEWER: "VIEWER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const TeamMemberRole = {
  LEAD: "LEAD",
  MEMBER: "MEMBER",
} as const;

export type TeamMemberRole =
  (typeof TeamMemberRole)[keyof typeof TeamMemberRole];

export const IncidentStatus = {
  TRIGGERED: "TRIGGERED",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  RESOLVED: "RESOLVED",
} as const;

export type IncidentStatus =
  (typeof IncidentStatus)[keyof typeof IncidentStatus];

export const IncidentUrgency = {
  HIGH: "HIGH",
  LOW: "LOW",
} as const;

export type IncidentUrgency =
  (typeof IncidentUrgency)[keyof typeof IncidentUrgency];

export const EscalationTargetType = {
  USER: "USER",
  SCHEDULE: "SCHEDULE",
} as const;

export type EscalationTargetType =
  (typeof EscalationTargetType)[keyof typeof EscalationTargetType];

export const IncidentLogAction = {
  TRIGGERED: "TRIGGERED",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  RESOLVED: "RESOLVED",
  ESCALATED: "ESCALATED",
  REASSIGNED: "REASSIGNED",
  NOTE_ADDED: "NOTE_ADDED",
  NOTIFICATION_SENT: "NOTIFICATION_SENT",
} as const;

export type IncidentLogAction =
  (typeof IncidentLogAction)[keyof typeof IncidentLogAction];
