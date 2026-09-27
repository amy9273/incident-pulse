import { z } from "zod";

export const SocketSubscribeSchema = z.object({
  serviceId: z.string().uuid().optional(),
  incidentId: z.string().uuid().optional(),
});

export type SocketSubscribeRequest = z.infer<typeof SocketSubscribeSchema>;
