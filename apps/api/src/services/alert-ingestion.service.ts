import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  IncidentLogAction,
  IncidentStatus,
  IncidentUrgency,
  WebhookAlertRequest,
  WebhookAlertResponse,
} from "@incident-pulse/shared";
import { prisma } from "../lib/prisma.js";
import { ServiceContext } from "../types/express.js";
import { logger } from "../lib/logger.js";

export class AlertIngestionService {
  /**
   * Generates a deterministic SHA-256 fingerprint if not provided by caller.
   */
  generateFingerprint(
    serviceId: string,
    title: string,
    urgency: IncidentUrgency,
    customFingerprint?: string,
  ): string {
    if (customFingerprint && customFingerprint.trim().length > 0) {
      return customFingerprint.trim();
    }

    const normalizedTitle = title.trim().toLowerCase();
    const sourceString = `${serviceId}:${normalizedTitle}:${urgency}`;
    return createHash("sha256").update(sourceString).digest("hex");
  }

  /**
   * Ingests an incoming webhook alert with deduplication against active incidents.
   * Enforces Invariant #2 (Idempotency) and Invariant #3 (Transactional Integrity).
   */
  async ingestAlert(
    service: ServiceContext,
    alertData: WebhookAlertRequest,
  ): Promise<WebhookAlertResponse> {
    const urgency = alertData.urgency || IncidentUrgency.HIGH;
    const fingerprint = this.generateFingerprint(
      service.id,
      alertData.title,
      urgency,
      alertData.fingerprint,
    );

    const hasPayload = alertData.payload !== undefined;

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Check for open incident with identical fingerprint on this service
      const openIncident = await tx.incident.findFirst({
        where: {
          serviceId: service.id,
          fingerprint,
          status: {
            in: [IncidentStatus.TRIGGERED, IncidentStatus.ACKNOWLEDGED],
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // 2A. Deduplication branch: update existing open incident
      if (openIncident) {
        const updatedIncident = await tx.incident.update({
          where: { id: openIncident.id },
          data: {
            alertCount: { increment: 1 },
            updatedAt: new Date(),
            ...(alertData.summary ? { summary: alertData.summary } : {}),
            ...(hasPayload && alertData.payload
              ? { payload: alertData.payload }
              : {}),
          },
        });

        await tx.incidentLog.create({
          data: {
            incidentId: openIncident.id,
            action: IncidentLogAction.TRIGGERED,
            message: `Deduplicated alert received (occurrence #${updatedIncident.alertCount})`,
            metadata: {
              fingerprint,
              incomingTitle: alertData.title,
              ...(hasPayload && alertData.payload
                ? { payload: alertData.payload }
                : {}),
            },
          },
        });

        logger.info(
          {
            serviceId: service.id,
            incidentId: openIncident.id,
            alertCount: updatedIncident.alertCount,
            fingerprint,
          },
          "Deduplicated incoming alert against existing open incident",
        );

        return {
          status: "deduplicated" as const,
          incidentId: updatedIncident.id,
          alertCount: updatedIncident.alertCount,
          incident: {
            id: updatedIncident.id,
            title: updatedIncident.title,
            summary: updatedIncident.summary,
            status: updatedIncident.status,
            urgency: updatedIncident.urgency,
            serviceId: updatedIncident.serviceId,
            fingerprint: updatedIncident.fingerprint,
            alertCount: updatedIncident.alertCount,
            escalationStep: updatedIncident.escalationStep,
            createdAt: updatedIncident.createdAt.toISOString(),
            updatedAt: updatedIncident.updatedAt.toISOString(),
          },
        };
      }

      // 2B. Fresh incident branch: create new TRIGGERED incident
      const newIncident = await tx.incident.create({
        data: {
          title: alertData.title,
          summary: alertData.summary,
          status: IncidentStatus.TRIGGERED,
          urgency,
          serviceId: service.id,
          fingerprint,
          alertCount: 1,
          escalationStep: 1,
          ...(hasPayload && alertData.payload
            ? { payload: alertData.payload }
            : {}),
          logs: {
            create: {
              action: IncidentLogAction.TRIGGERED,
              message: `Alert triggered: ${alertData.title}`,
              metadata: {
                fingerprint,
                ...(hasPayload && alertData.payload
                  ? { payload: alertData.payload }
                  : {}),
              },
            },
          },
        },
      });

      logger.info(
        {
          serviceId: service.id,
          incidentId: newIncident.id,
          fingerprint,
        },
        "Created new TRIGGERED incident from incoming webhook",
      );

      return {
        status: "created" as const,
        incidentId: newIncident.id,
        alertCount: 1,
        incident: {
          id: newIncident.id,
          title: newIncident.title,
          summary: newIncident.summary,
          status: newIncident.status,
          urgency: newIncident.urgency,
          serviceId: newIncident.serviceId,
          fingerprint: newIncident.fingerprint,
          alertCount: 1,
          escalationStep: 1,
          createdAt: newIncident.createdAt.toISOString(),
          updatedAt: newIncident.updatedAt.toISOString(),
        },
      };
    });
  }
}

export const alertIngestionService = new AlertIngestionService();
