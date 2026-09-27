import crypto from "node:crypto";
import {
  CreateServiceRequest,
  IncidentStatus,
  ServiceListItem,
  UpdateServiceRequest,
} from "@incident-pulse/shared";
import { prisma } from "../lib/prisma.js";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { logger } from "../lib/logger.js";

export class ServiceService {
  /**
   * Generates a cryptographically secure service API key.
   */
  private generateServiceKey(): string {
    return `inc_live_${crypto.randomBytes(16).toString("hex")}`;
  }

  /**
   * Generates a URL-safe slug from a service name.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  /**
   * List all active monitored services with health metrics and escalation policy summary.
   */
  async listServices(): Promise<ServiceListItem[]> {
    const services = await prisma.service.findMany({
      where: { deletedAt: null },
      include: {
        escalationPolicy: {
          include: {
            rules: {
              include: {
                targetUser: {
                  select: { id: true, name: true, email: true },
                },
                targetSchedule: {
                  select: { id: true, name: true },
                },
              },
              orderBy: { stepNumber: "asc" },
            },
          },
        },
        incidents: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return services.map((srv) => {
      const totalIncidents = srv.incidents.length;
      const activeIncidents = srv.incidents.filter(
        (i) =>
          i.status === IncidentStatus.TRIGGERED ||
          i.status === IncidentStatus.ACKNOWLEDGED,
      ).length;

      const status: "HEALTHY" | "CRITICAL" =
        activeIncidents > 0 ? "CRITICAL" : "HEALTHY";

      return {
        id: srv.id,
        name: srv.name,
        slug: srv.slug,
        description: srv.description,
        serviceKey: srv.serviceKey,
        escalationPolicyId: srv.escalationPolicyId,
        escalationPolicy: {
          id: srv.escalationPolicy.id,
          name: srv.escalationPolicy.name,
          rules: srv.escalationPolicy.rules.map((r) => ({
            id: r.id,
            stepNumber: r.stepNumber,
            delayMinutes: r.delayMinutes,
            targetType: r.targetType,
            targetUserId: r.targetUserId,
            targetUser: r.targetUser,
            targetScheduleId: r.targetScheduleId,
            targetSchedule: r.targetSchedule,
          })),
        },
        totalIncidents,
        activeIncidents,
        status,
        createdAt: srv.createdAt.toISOString(),
        updatedAt: srv.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Retrieves a single service by ID with detailed escalation rules and recent incidents.
   */
  async getServiceById(id: string) {
    const service = await prisma.service.findFirst({
      where: { id, deletedAt: null },
      include: {
        escalationPolicy: {
          include: {
            rules: {
              include: {
                targetUser: {
                  select: { id: true, name: true, email: true },
                },
                targetSchedule: {
                  select: { id: true, name: true },
                },
              },
              orderBy: { stepNumber: "asc" },
            },
          },
        },
        incidents: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            status: true,
            urgency: true,
            alertCount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundError(`Service with ID ${id} not found`);
    }

    const totalIncidents = await prisma.incident.count({
      where: { serviceId: id },
    });

    const activeIncidents = await prisma.incident.count({
      where: {
        serviceId: id,
        status: { in: [IncidentStatus.TRIGGERED, IncidentStatus.ACKNOWLEDGED] },
      },
    });

    return {
      id: service.id,
      name: service.name,
      slug: service.slug,
      description: service.description,
      serviceKey: service.serviceKey,
      escalationPolicyId: service.escalationPolicyId,
      escalationPolicy: {
        id: service.escalationPolicy.id,
        name: service.escalationPolicy.name,
        rules: service.escalationPolicy.rules,
      },
      recentIncidents: service.incidents.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
      })),
      totalIncidents,
      activeIncidents,
      status: activeIncidents > 0 ? "CRITICAL" : "HEALTHY",
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }

  /**
   * Creates a new monitored service.
   */
  async createService(data: CreateServiceRequest) {
    // Verify escalation policy exists
    const policy = await prisma.escalationPolicy.findFirst({
      where: { id: data.escalationPolicyId, deletedAt: null },
    });

    if (!policy) {
      throw new NotFoundError(
        `Escalation policy ${data.escalationPolicyId} not found`,
      );
    }

    let slug = data.slug
      ? this.generateSlug(data.slug)
      : this.generateSlug(data.name);

    // Verify slug uniqueness
    const existingSlug = await prisma.service.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      slug = `${slug}-${crypto.randomBytes(3).toString("hex")}`;
    }

    const serviceKey = this.generateServiceKey();

    const service = await prisma.service.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        serviceKey,
        escalationPolicyId: data.escalationPolicyId,
      },
      include: {
        escalationPolicy: {
          select: { id: true, name: true },
        },
      },
    });

    logger.info(
      { serviceId: service.id, slug: service.slug },
      "Monitored service created",
    );

    return {
      id: service.id,
      name: service.name,
      slug: service.slug,
      description: service.description,
      serviceKey: service.serviceKey,
      escalationPolicyId: service.escalationPolicyId,
      escalationPolicy: service.escalationPolicy,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }

  /**
   * Rotates a service integration API key.
   */
  async rotateServiceKey(id: string) {
    const service = await prisma.service.findFirst({
      where: { id, deletedAt: null },
    });

    if (!service) {
      throw new NotFoundError(`Service with ID ${id} not found`);
    }

    const newKey = this.generateServiceKey();

    const updated = await prisma.service.update({
      where: { id },
      data: { serviceKey: newKey },
      select: {
        id: true,
        name: true,
        slug: true,
        serviceKey: true,
        updatedAt: true,
      },
    });

    logger.info(
      { serviceId: updated.id, newKeyPrefix: newKey.slice(0, 16) },
      "Service integration key rotated",
    );

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      serviceKey: updated.serviceKey,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Updates service configuration.
   */
  async updateService(id: string, data: UpdateServiceRequest) {
    const existing = await prisma.service.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`Service with ID ${id} not found`);
    }

    if (data.escalationPolicyId) {
      const policy = await prisma.escalationPolicy.findFirst({
        where: { id: data.escalationPolicyId, deletedAt: null },
      });
      if (!policy) {
        throw new NotFoundError(
          `Escalation policy ${data.escalationPolicyId} not found`,
        );
      }
    }

    let slug = existing.slug;
    if (data.slug) {
      slug = this.generateSlug(data.slug);
      if (slug !== existing.slug) {
        const slugConflict = await prisma.service.findUnique({
          where: { slug },
        });
        if (slugConflict) {
          throw new BadRequestError(`Slug '${slug}' is already in use`);
        }
      }
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        slug,
        description:
          data.description !== undefined ? data.description : undefined,
        escalationPolicyId: data.escalationPolicyId ?? undefined,
      },
      include: {
        escalationPolicy: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      serviceKey: updated.serviceKey,
      escalationPolicyId: updated.escalationPolicyId,
      escalationPolicy: updated.escalationPolicy,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes a monitored service.
   */
  async deleteService(id: string) {
    const service = await prisma.service.findFirst({
      where: { id, deletedAt: null },
    });

    if (!service) {
      throw new NotFoundError(`Service with ID ${id} not found`);
    }

    // Check if there are active incidents
    const activeIncidents = await prisma.incident.count({
      where: {
        serviceId: id,
        status: { in: [IncidentStatus.TRIGGERED, IncidentStatus.ACKNOWLEDGED] },
      },
    });

    if (activeIncidents > 0) {
      throw new BadRequestError(
        `Cannot delete service with ${activeIncidents} active/open incidents. Resolve all incidents first.`,
      );
    }

    await prisma.service.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.info({ serviceId: id }, "Service soft-deleted");
  }
}

export const serviceService = new ServiceService();
