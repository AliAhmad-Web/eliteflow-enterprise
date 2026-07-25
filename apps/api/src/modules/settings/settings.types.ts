import type { UserRole } from "@enterprise/shared";

export interface SettingsActor {
  userId: string;
  role: UserRole | string;
  email: string;
  permissions: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SettingsRequestContext {
  ipAddress: string;
  userAgent: string;
}
