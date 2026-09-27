"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { AuthUser, LoginResponse } from "@incident-pulse/shared";
import { apiClient } from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setSession: (token: string, user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "incident_pulse_token";
const USER_KEY = "incident_pulse_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
    }
  }, []);

  const setSession = useCallback((newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      document.cookie = `${TOKEN_KEY}=${newToken}; path=/; max-age=604800; SameSite=Lax`;
    }
  }, []);

  // Restore session from localStorage & verify with /api/v1/auth/me
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser) as AuthUser;
          setToken(storedToken);
          setUser(parsedUser);

          // Verify token validity with backend
          try {
            const data = await apiClient<{ user: AuthUser }>(
              "/api/v1/auth/me",
              {
                token: storedToken,
              },
            );
            setUser(data.user);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          } catch {
            // Token expired or invalid
            logout();
          }
        }
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, [logout]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);
      try {
        const response = await apiClient<LoginResponse>("/api/v1/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        setSession(response.token, response.user);
      } finally {
        setIsLoading(false);
      }
    },
    [setSession],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        setSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
