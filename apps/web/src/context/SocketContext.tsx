"use client";

import * as React from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { IncidentDetail, WebSocketEvent } from "@incident-pulse/shared";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastEventTime: Date | null;
}

const SocketContext = React.createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  lastEventTime: null,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState<boolean>(false);
  const [lastEventTime, setLastEventTime] = React.useState<Date | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated || !token) {
      setIsConnected(false);
      setSocket(null);
      return;
    }

    const newSocket = io(API_URL, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("connect_error", () => {
      setIsConnected(false);
    });

    // Handle incident:created
    newSocket.on(
      WebSocketEvent.INCIDENT_CREATED,
      (incident: IncidentDetail) => {
        setLastEventTime(new Date());

        queryClient.invalidateQueries({ queryKey: ["incidents"] });
        queryClient.setQueryData(["incident", incident.id], incident);
      },
    );

    // Handle incident:updated
    newSocket.on(
      WebSocketEvent.INCIDENT_UPDATED,
      (incident: IncidentDetail) => {
        setLastEventTime(new Date());

        queryClient.invalidateQueries({ queryKey: ["incidents"] });
        queryClient.setQueryData(["incident", incident.id], incident);
      },
    );

    // Handle incident:escalated
    newSocket.on(
      WebSocketEvent.INCIDENT_ESCALATED,
      (incident: IncidentDetail) => {
        setLastEventTime(new Date());

        queryClient.invalidateQueries({ queryKey: ["incidents"] });
        queryClient.setQueryData(["incident", incident.id], incident);
      },
    );

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, isAuthenticated, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, lastEventTime }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  return React.useContext(SocketContext);
}
