export const WebSocketEvent = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  ERROR: "error",
  INCIDENT_CREATED: "incident:created",
  INCIDENT_UPDATED: "incident:updated",
  INCIDENT_ESCALATED: "incident:escalated",
  INCIDENT_SUBSCRIBE: "incident:subscribe",
  INCIDENT_UNSUBSCRIBE: "incident:unsubscribe",
} as const;

export type WebSocketEvent =
  (typeof WebSocketEvent)[keyof typeof WebSocketEvent];

export const WebSocketRoom = {
  GLOBAL: "incidents:global",
  service: (serviceId: string) => `service:${serviceId}`,
  user: (userId: string) => `user:${userId}`,
  incident: (incidentId: string) => `incident:${incidentId}`,
} as const;
