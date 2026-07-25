import type { UserRole } from "@enterprise/shared";

export type NotificationsActor = {
  userId: string;
  role: UserRole | string;
  email: string;
  permissions: string[];
};

export function isOrgAdmin(actor: NotificationsActor): boolean {
  return actor.role === "ADMIN" || actor.role === "SUPER_ADMIN";
}

export function isSuperAdmin(actor: NotificationsActor): boolean {
  return actor.role === "SUPER_ADMIN";
}
