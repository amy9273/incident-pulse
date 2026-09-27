const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export class ApiError extends Error {
  public status: number;
  public data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  const authToken =
    token ||
    (typeof window !== "undefined"
      ? localStorage.getItem("incident_pulse_token")
      : null);

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers,
    });

    if (!response.ok) {
      let errorData: unknown;
      let errorMessage = `HTTP error ${response.status}`;
      try {
        errorData = await response.json();
        if (
          errorData &&
          typeof errorData === "object" &&
          "error" in errorData &&
          typeof errorData.error === "object" &&
          errorData.error &&
          "message" in errorData.error
        ) {
          errorMessage = String(errorData.error.message);
        } else if (
          errorData &&
          typeof errorData === "object" &&
          "message" in errorData
        ) {
          errorMessage = String(errorData.message);
        }
      } catch {
        // Response wasn't JSON
      }
      throw new ApiError(errorMessage, response.status, errorData);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message =
      err instanceof Error ? err.message : "Network request failed";
    throw new ApiError(message, 0);
  }
}
