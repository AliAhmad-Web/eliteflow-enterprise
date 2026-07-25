import type { UserRole } from "@enterprise/shared";

export interface SecurityActor {
  userId: string;
  role: UserRole | string;
  email: string;
  permissions: string[];
  sessionId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SecurityRequestContext {
  ipAddress: string;
  userAgent: string;
}
