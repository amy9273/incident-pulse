import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  AuthUser,
  JwtAuthPayload,
  LoginRequest,
  LoginResponse,
} from "@incident-pulse/shared";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { UnauthorizedError } from "../errors/index.js";

export class AuthService {
  /**
   * Authenticates a user with email and password, issuing a JWT.
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const user = await prisma.user.findFirst({
      where: {
        email: credentials.email.toLowerCase().trim(),
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = this.generateToken(authUser);

    return {
      token,
      user: authUser,
    };
  }

  /**
   * Generates a signed JWT for the user.
   */
  generateToken(user: AuthUser): string {
    const payload: JwtAuthPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });
  }

  /**
   * Verifies and decodes a JWT token.
   */
  verifyToken(token: string): JwtAuthPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtAuthPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Authentication token has expired");
      }
      throw new UnauthorizedError("Invalid authentication token");
    }
  }

  /**
   * Fetches active user by ID.
   */
  async getUserById(id: string): Promise<AuthUser> {
    const user = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("User account not found or deactivated");
    }

    return user;
  }
}

export const authService = new AuthService();
