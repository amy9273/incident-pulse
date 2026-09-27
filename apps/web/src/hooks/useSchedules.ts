"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  CreateScheduleRequest,
  CreateShiftRequest,
  ScheduleDetail,
  ScheduleShift,
} from "@incident-pulse/shared";

export function useSchedules() {
  return useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      const response = await apiClient<{ schedules: ScheduleDetail[] }>(
        "/api/v1/schedules",
      );
      return response.schedules;
    },
    refetchInterval: 30000,
  });
}

export function useSchedule(
  id: string | null,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ["schedule", id, startDate, endDate],
    queryFn: async () => {
      if (!id) return null;
      const params = new URLSearchParams();
      if (startDate) params.append("start", startDate);
      if (endDate) params.append("end", endDate);
      const query = params.toString() ? `?${params.toString()}` : "";

      const response = await apiClient<{ schedule: ScheduleDetail }>(
        `/api/v1/schedules/${id}${query}`,
      );
      return response.schedule;
    },
    enabled: !!id,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScheduleRequest) => {
      const response = await apiClient<{ schedule: ScheduleDetail }>(
        "/api/v1/schedules",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      return response.schedule;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      data,
    }: {
      scheduleId: string;
      data: CreateShiftRequest;
    }) => {
      const response = await apiClient<{ shift: ScheduleShift }>(
        `/api/v1/schedules/${scheduleId}/shifts`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      return response.shift;
    },
    onSettled: (_data, _err, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["schedule", scheduleId] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      shiftId,
    }: {
      scheduleId: string;
      shiftId: string;
    }) => {
      await apiClient(`/api/v1/schedules/${scheduleId}/shifts/${shiftId}`, {
        method: "DELETE",
      });
    },
    onSettled: (_data, _err, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["schedule", scheduleId] });
    },
  });
}
