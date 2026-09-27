import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 10, // 10 seconds
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (
            error &&
            typeof error === "object" &&
            "status" in error &&
            (error as { status: number }).status === 401
          ) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}
