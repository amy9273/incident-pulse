import { z } from "zod";
import { UserRole } from "../constants/status.js";

export const LoginRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum([UserRole.ADMIN, UserRole.RESPONDER, UserRole.VIEWER]),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: AuthUserSchema,
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export interface JwtAuthPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
