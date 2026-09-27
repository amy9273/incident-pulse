import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateServiceRequest,
  ServiceListItem,
  UpdateServiceRequest,
} from "@incident-pulse/shared";
import { apiClient } from "@/lib/api";

export interface ServiceDetail extends ServiceListItem {
  recentIncidents?: Array<{
    id: string;
    title: string;
    status: string;
    urgency: string;
    alertCount: number;
    createdAt: string;
  }>;
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const res = await apiClient<{ services: ServiceListItem[] }>(
        "/api/v1/services",
      );
      return res.services;
    },
    staleTime: 10_000,
  });
}

export function useService(id: string | null) {
  return useQuery({
    queryKey: ["services", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient<{ service: ServiceDetail }>(
        `/api/v1/services/${id}`,
      );
      return res.service;
    },
    enabled: !!id,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateServiceRequest) => {
      const res = await apiClient<{ service: ServiceListItem }>(
        "/api/v1/services",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      return res.service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateServiceRequest;
    }) => {
      const res = await apiClient<{ service: ServiceListItem }>(
        `/api/v1/services/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );
      return res.service;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["services", variables.id] });
    },
  });
}

export function useRotateServiceKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await apiClient<{
        service: { id: string; serviceKey: string };
      }>(`/api/v1/services/${serviceId}/rotate-key`, {
        method: "POST",
      });
      return res.service;
    },
    onSuccess: (_, serviceId) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["services", serviceId] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      await apiClient(`/api/v1/services/${serviceId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}
