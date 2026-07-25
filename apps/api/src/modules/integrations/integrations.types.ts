import type { UserRole } from "@enterprise/shared";

export interface IntegrationsActor {
  userId: string;
  role: UserRole | string;
  email: string;
  permissions: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface IntegrationsRequestContext {
  ipAddress: string;
  userAgent: string;
}
