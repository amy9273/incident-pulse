export const IncidentStatus = {
  TRIGGERED: 'TRIGGERED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
} as const;

export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

export const IncidentUrgency = {
  HIGH: 'HIGH',
  LOW: 'LOW',
} as const;

export type IncidentUrgency = (typeof IncidentUrgency)[keyof typeof IncidentUrgency];

export const UserRole = {
  ADMIN: 'ADMIN',
  RESPONDER: 'RESPONDER',
  VIEWER: 'VIEWER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
