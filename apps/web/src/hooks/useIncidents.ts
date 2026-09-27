"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  IncidentDetail,
  IncidentStatus,
  IncidentUrgency,
  WebhookAlertRequest,
} from "@incident-pulse/shared";

export interface IncidentFilters {
  status?: IncidentStatus | "ALL";
  urgency?: IncidentUrgency | "ALL";
  serviceId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface IncidentsResponse {
  incidents: IncidentDetail[];
  total: number;
  limit: number;
  offset: number;
}

export function useIncidents(filters: IncidentFilters = {}) {
  return useQuery({
    queryKey: ["incidents", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== "ALL") {
        params.append("status", filters.status);
      }
      if (filters.urgency && filters.urgency !== "ALL") {
        params.append("urgency", filters.urgency);
      }
      if (filters.serviceId) {
        params.append("serviceId", filters.serviceId);
      }
      if (filters.limit) {
        params.append("limit", filters.limit.toString());
      }
      if (filters.offset) {
        params.append("offset", filters.offset.toString());
      }

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const response = await apiClient<IncidentsResponse>(
        `/api/v1/incidents${queryString}`,
      );
      return response;
    },
    refetchInterval: 15000,
  });
}

export function useIncident(id: string | null) {
  return useQuery({
    queryKey: ["incident", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient<{ incident: IncidentDetail }>(
        `/api/v1/incidents/${id}`,
      );
      return response.incident;
    },
    enabled: !!id,
  });
}

export function useAcknowledgeIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incidentId: string) => {
      const response = await apiClient<{ incident: IncidentDetail }>(
        `/api/v1/incidents/${incidentId}/acknowledge`,
        {
          method: "POST",
        },
      );
      return response.incident;
    },
    onMutate: async (incidentId: string) => {
      await queryClient.cancelQueries({ queryKey: ["incidents"] });
      await queryClient.cancelQueries({ queryKey: ["incident", incidentId] });

      const previousIncident = queryClient.getQueryData<IncidentDetail>([
        "incident",
        incidentId,
      ]);

      if (previousIncident) {
        queryClient.setQueryData(["incident", incidentId], {
          ...previousIncident,
          status: IncidentStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date().toISOString(),
        });
      }

      return { previousIncident };
    },
    onError: (_err, incidentId, context) => {
      if (context?.previousIncident) {
        queryClient.setQueryData(
          ["incident", incidentId],
          context.previousIncident,
        );
      }
    },
    onSettled: (_data, _err, incidentId) => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    },
  });
}

export function useResolveIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incidentId: string) => {
      const response = await apiClient<{ incident: IncidentDetail }>(
        `/api/v1/incidents/${incidentId}/resolve`,
        {
          method: "POST",
        },
      );
      return response.incident;
    },
    onMutate: async (incidentId: string) => {
      await queryClient.cancelQueries({ queryKey: ["incidents"] });
      await queryClient.cancelQueries({ queryKey: ["incident", incidentId] });

      const previousIncident = queryClient.getQueryData<IncidentDetail>([
        "incident",
        incidentId,
      ]);

      if (previousIncident) {
        queryClient.setQueryData(["incident", incidentId], {
          ...previousIncident,
          status: IncidentStatus.RESOLVED,
          resolvedAt: new Date().toISOString(),
        });
      }

      return { previousIncident };
    },
    onError: (_err, incidentId, context) => {
      if (context?.previousIncident) {
        queryClient.setQueryData(
          ["incident", incidentId],
          context.previousIncident,
        );
      }
    },
    onSettled: (_data, _err, incidentId) => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    },
  });
}

export function useTriggerTestAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceKey,
      payload,
    }: {
      serviceKey: string;
      payload: WebhookAlertRequest;
    }) => {
      const response = await apiClient<{
        incident: IncidentDetail;
        isDuplicate: boolean;
      }>(`/api/v1/webhooks/services/${serviceKey}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return response;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}
