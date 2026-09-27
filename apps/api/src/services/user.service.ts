import { AuthUser } from "@incident-pulse/shared";
import { prisma } from "../lib/prisma.js";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RESPONDER" | "VIEWER";
};

export class UserService {
  async listUsers(): Promise<AuthUser[]> {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    return (users as UserRecord[]).map((u: UserRecord) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  }
}

export const userService = new UserService();
