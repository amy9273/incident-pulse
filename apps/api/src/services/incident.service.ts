import { Prisma } from "@prisma/client";
import {
  AuthUser,
  IncidentDetail,
  IncidentListQuery,
  IncidentLogAction,
  IncidentStatus,
  IncidentUrgency,
} from "@incident-pulse/shared";
import { prisma } from "../lib/prisma.js";
import { ConflictError, NotFoundError } from "../errors/index.js";
import { escalationService } from "./escalation.service.js";
import { logger } from "../lib/logger.js";

type IncidentWithRelations = {
  id: string;
  title: string;
  summary: string | null;
  status: IncidentStatus;
  urgency: IncidentUrgency;
  serviceId: string;
  assigneeId: string | null;
  fingerprint: string;
  escalationStep: number;
  alertCount: number;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  service: { id: string; name: string };
  assignee: { id: string; name: string; email: string } | null;
};

type IncidentLogWithMeta = {
  id: string;
  incidentId: string;
  actorId: string | null;
  action: IncidentLogAction;
  message: string;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
};

export class IncidentService {
  /**
   * Retrieves a paginated list of incidents with filtering.
   */
  async listIncidents(query: IncidentListQuery): Promise<{
    incidents: IncidentDetail[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.urgency ? { urgency: query.urgency } : {}),
      ...(query.serviceId ? { serviceId: query.serviceId } : {}),
    };

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include: {
          service: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.incident.count({ where }),
    ]);

    const formattedIncidents: IncidentDetail[] = (
      incidents as IncidentWithRelations[]
    ).map((inc: IncidentWithRelations) => ({
      id: inc.id,
      title: inc.title,
      summary: inc.summary,
      status: inc.status,
      urgency: inc.urgency,
      serviceId: inc.serviceId,
      serviceName: inc.service.name,
      assigneeId: inc.assigneeId,
      assigneeName: inc.assignee?.name ?? null,
      fingerprint: inc.fingerprint,
      escalationStep: inc.escalationStep,
      alertCount: inc.alertCount,
      acknowledgedAt: inc.acknowledgedAt?.toISOString() ?? null,
      resolvedAt: inc.resolvedAt?.toISOString() ?? null,
      payload: (inc.payload as Record<string, unknown>) ?? null,
      createdAt: inc.createdAt.toISOString(),
      updatedAt: inc.updatedAt.toISOString(),
    }));

    return {
      incidents: formattedIncidents,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  /**
   * Retrieves an incident by ID with complete audit history logs.
   */
  async getIncidentById(id: string): Promise<IncidentDetail> {
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        service: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        logs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!incident) {
      throw new NotFoundError(`Incident with ID ${id} not found`);
    }

    const inc = incident as IncidentWithRelations & {
      logs: IncidentLogWithMeta[];
    };

    return {
      id: inc.id,
      title: inc.title,
      summary: inc.summary,
      status: inc.status,
      urgency: inc.urgency,
      serviceId: inc.serviceId,
      serviceName: inc.service.name,
      assigneeId: inc.assigneeId,
      assigneeName: inc.assignee?.name ?? null,
      fingerprint: inc.fingerprint,
      escalationStep: inc.escalationStep,
      alertCount: inc.alertCount,
      acknowledgedAt: inc.acknowledgedAt?.toISOString() ?? null,
      resolvedAt: inc.resolvedAt?.toISOString() ?? null,
      payload: (inc.payload as Record<string, unknown>) ?? null,
      createdAt: inc.createdAt.toISOString(),
      updatedAt: inc.updatedAt.toISOString(),
      logs: inc.logs.map((log: IncidentLogWithMeta) => ({
        id: log.id,
        incidentId: log.incidentId,
        actorId: log.actorId,
        action: log.action,
        message: log.message,
        metadata: (log.metadata as Record<string, unknown>) ?? null,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Acknowledges an incident and cancels pending BullMQ escalation timers (Invariant #1).
   */
  async acknowledgeIncident(
    id: string,
    actor: AuthUser,
    note?: string,
  ): Promise<IncidentDetail> {
    const updated = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const incident = await tx.incident.findUnique({
          where: { id },
        });

        if (!incident) {
          throw new NotFoundError(`Incident with ID ${id} not found`);
        }

        if (incident.status === IncidentStatus.RESOLVED) {
          throw new ConflictError(
            "Cannot acknowledge an already resolved incident",
          );
        }

        const acked = await tx.incident.update({
          where: { id },
          data: {
            status: IncidentStatus.ACKNOWLEDGED,
            acknowledgedAt: new Date(),
            assigneeId: incident.assigneeId ?? actor.id,
          },
          include: {
            service: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true, email: true } },
          },
        });

        await tx.incidentLog.create({
          data: {
            incidentId: id,
            actorId: actor.id,
            action: IncidentLogAction.ACKNOWLEDGED,
            message: note
              ? `Acknowledged by ${actor.name}: ${note}`
              : `Acknowledged by ${actor.name}`,
          },
        });

        return acked;
      },
    );

    // Invariant #1: Cancel pending delayed escalation timers
    await escalationService.cancelEscalation(id);

    logger.info(
      { incidentId: id, actorId: actor.id },
      "Incident successfully acknowledged; escalation timer cancelled",
    );

    return this.getIncidentById(updated.id);
  }

  /**
   * Resolves an incident and cancels pending BullMQ escalation timers (Invariant #1).
   */
  async resolveIncident(
    id: string,
    actor: AuthUser,
    resolutionNotes?: string,
  ): Promise<IncidentDetail> {
    const updated = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const incident = await tx.incident.findUnique({
          where: { id },
        });

        if (!incident) {
          throw new NotFoundError(`Incident with ID ${id} not found`);
        }

        const resolved = await tx.incident.update({
          where: { id },
          data: {
            status: IncidentStatus.RESOLVED,
            resolvedAt: new Date(),
          },
          include: {
            service: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true, email: true } },
          },
        });

        await tx.incidentLog.create({
          data: {
            incidentId: id,
            actorId: actor.id,
            action: IncidentLogAction.RESOLVED,
            message: resolutionNotes
              ? `Resolved by ${actor.name}: ${resolutionNotes}`
              : `Resolved by ${actor.name}`,
          },
        });

        return resolved;
      },
    );

    // Invariant #1: Cancel pending delayed escalation timers
    await escalationService.cancelEscalation(id);

    logger.info(
      { incidentId: id, actorId: actor.id },
      "Incident successfully resolved",
    );

    return this.getIncidentById(updated.id);
  }
}

export const incidentService = new IncidentService();
