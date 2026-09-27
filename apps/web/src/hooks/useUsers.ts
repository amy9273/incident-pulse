"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AuthUser } from "@incident-pulse/shared";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiClient<{ users: AuthUser[] }>("/api/v1/users");
      return response.users;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}
