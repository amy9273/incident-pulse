import {
  IncidentDetail,
  WebSocketEvent,
  WebSocketRoom,
} from "@incident-pulse/shared";
import { getSocketServer } from "./socket.server.js";
import { logger } from "../lib/logger.js";

export class SocketEmitter {
  /**
   * Broadcasts a newly created incident across the global feed,
   * service room, and assigned responder's personal room.
   */
  broadcastIncidentCreated(incident: IncidentDetail): void {
    const io = getSocketServer();
    if (!io) {
      return;
    }

    const rooms: string[] = [
      WebSocketRoom.GLOBAL,
      WebSocketRoom.service(incident.serviceId),
    ];

    if (incident.assigneeId) {
      rooms.push(WebSocketRoom.user(incident.assigneeId));
    }

    io.to(rooms).emit(WebSocketEvent.INCIDENT_CREATED, incident);

    logger.debug(
      { incidentId: incident.id, serviceId: incident.serviceId, rooms },
      "📢 Broadcasted incident:created event via WebSockets",
    );
  }

  /**
   * Broadcasts an incident state update (acknowledgment, resolution, deduplication, re-assignment)
   * across global, service, incident, and user rooms.
   */
  broadcastIncidentUpdated(incident: IncidentDetail): void {
    const io = getSocketServer();
    if (!io) {
      return;
    }

    const rooms: string[] = [
      WebSocketRoom.GLOBAL,
      WebSocketRoom.service(incident.serviceId),
      WebSocketRoom.incident(incident.id),
    ];

    if (incident.assigneeId) {
      rooms.push(WebSocketRoom.user(incident.assigneeId));
    }

    io.to(rooms).emit(WebSocketEvent.INCIDENT_UPDATED, incident);

    logger.debug(
      {
        incidentId: incident.id,
        status: incident.status,
        rooms,
      },
      "📢 Broadcasted incident:updated event via WebSockets",
    );
  }

  /**
   * Broadcasts an automated escalation state progression across rooms.
   */
  broadcastIncidentEscalated(incident: IncidentDetail): void {
    const io = getSocketServer();
    if (!io) {
      return;
    }

    const rooms: string[] = [
      WebSocketRoom.GLOBAL,
      WebSocketRoom.service(incident.serviceId),
      WebSocketRoom.incident(incident.id),
    ];

    if (incident.assigneeId) {
      rooms.push(WebSocketRoom.user(incident.assigneeId));
    }

    io.to(rooms).emit(WebSocketEvent.INCIDENT_ESCALATED, incident);
    io.to(rooms).emit(WebSocketEvent.INCIDENT_UPDATED, incident);

    logger.debug(
      {
        incidentId: incident.id,
        escalationStep: incident.escalationStep,
        rooms,
      },
      "🚨 Broadcasted incident:escalated event via WebSockets",
    );
  }
}

export const socketEmitter = new SocketEmitter();
