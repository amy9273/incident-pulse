import { Server as HttpServer } from "node:http";
import { Server, Socket } from "socket.io";
import {
  AuthUser,
  SocketSubscribeSchema,
  WebSocketEvent,
  WebSocketRoom,
} from "@incident-pulse/shared";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { authService } from "../services/auth.service.js";

export interface SocketData {
  user: AuthUser;
}

let io: Server | null = null;

/**
 * Initializes the Socket.io real-time server and registers authentication
 * middleware and room subscription event handlers.
 */
export const initSocketServer = (httpServer: HttpServer): Server => {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: env.WEB_URL,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // 1. JWT Authentication Handshake Middleware
  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const authHeader =
        socket.handshake.auth?.token || socket.handshake.headers?.authorization;

      if (!authHeader || typeof authHeader !== "string") {
        return next(new Error("Authentication token is missing"));
      }

      const token = authHeader.replace(/^Bearer\s+/i, "");
      const payload = authService.verifyToken(token);

      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      } as AuthUser;

      next();
    } catch (error) {
      logger.warn(
        { error: (error as Error).message },
        "Socket.io authentication handshake rejected",
      );
      next(new Error(`Unauthorized: ${(error as Error).message}`));
    }
  });

  // 2. Connection and Room Management
  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as AuthUser | undefined;

    if (!user) {
      socket.disconnect(true);
      return;
    }

    logger.info(
      { socketId: socket.id, userId: user.id, userEmail: user.email },
      "⚡ WebSocket client connected and authenticated",
    );

    // Automatically join global feed and personalized user room
    socket.join(WebSocketRoom.GLOBAL);
    socket.join(WebSocketRoom.user(user.id));

    // Handle service and incident-specific room subscriptions
    socket.on(WebSocketEvent.INCIDENT_SUBSCRIBE, (data: unknown) => {
      const parsed = SocketSubscribeSchema.safeParse(data);
      if (!parsed.success) {
        socket.emit(WebSocketEvent.ERROR, {
          message: "Invalid subscription payload",
          errors: parsed.error.format(),
        });
        return;
      }

      if (parsed.data.serviceId) {
        const room = WebSocketRoom.service(parsed.data.serviceId);
        socket.join(room);
        logger.debug(
          { socketId: socket.id, room },
          "Socket joined service room",
        );
      }

      if (parsed.data.incidentId) {
        const room = WebSocketRoom.incident(parsed.data.incidentId);
        socket.join(room);
        logger.debug(
          { socketId: socket.id, room },
          "Socket joined incident room",
        );
      }
    });

    // Handle room unsubscriptions
    socket.on(WebSocketEvent.INCIDENT_UNSUBSCRIBE, (data: unknown) => {
      const parsed = SocketSubscribeSchema.safeParse(data);
      if (!parsed.success) {
        socket.emit(WebSocketEvent.ERROR, {
          message: "Invalid unsubscription payload",
          errors: parsed.error.format(),
        });
        return;
      }

      if (parsed.data.serviceId) {
        const room = WebSocketRoom.service(parsed.data.serviceId);
        socket.leave(room);
        logger.debug({ socketId: socket.id, room }, "Socket left service room");
      }

      if (parsed.data.incidentId) {
        const room = WebSocketRoom.incident(parsed.data.incidentId);
        socket.leave(room);
        logger.debug(
          { socketId: socket.id, room },
          "Socket left incident room",
        );
      }
    });

    socket.on("disconnect", (reason: string) => {
      logger.info(
        { socketId: socket.id, userId: user.id, reason },
        "WebSocket client disconnected",
      );
    });
  });

  return io;
};

/**
 * Returns the active Socket.io server instance or null if not yet initialized.
 */
export const getSocketServer = (): Server | null => {
  return io;
};

/**
 * Gracefully closes all active WebSocket connections and the server.
 */
export const closeSocketServer = async (): Promise<void> => {
  if (io) {
    await new Promise<void>((resolve) => {
      io?.close(() => {
        io = null;
        resolve();
      });
    });
    logger.info("Socket.io server closed");
  }
};
