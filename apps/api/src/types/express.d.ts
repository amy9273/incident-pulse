import { AuthUser } from "@incident-pulse/shared";

export interface ServiceContext {
  id: string;
  name: string;
  slug: string;
  serviceKey: string;
  escalationPolicyId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      service?: ServiceContext;
    }
  }
}
