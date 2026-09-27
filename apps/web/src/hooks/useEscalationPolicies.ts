import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateEscalationPolicyRequest,
  EscalationPolicyDetail,
} from "@incident-pulse/shared";
import { apiClient } from "@/lib/api";

export function useEscalationPolicies() {
  return useQuery({
    queryKey: ["escalation-policies"],
    queryFn: async () => {
      const res = await apiClient<{ policies: EscalationPolicyDetail[] }>(
        "/api/v1/escalation-policies",
      );
      return res.policies;
    },
    staleTime: 10_000,
  });
}

export function useCreateEscalationPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateEscalationPolicyRequest) => {
      const res = await apiClient<{ policy: EscalationPolicyDetail }>(
        "/api/v1/escalation-policies",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      return res.policy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation-policies"] });
    },
  });
}
