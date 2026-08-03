import { PERMISSIONS, type UserRole } from "@enterprise/shared";

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

/** Super Admin / Admin / HR+employees with communication:write may compose & send mail. */
export function canCreateNotifications(actor: NotificationsActor): boolean {
  if (isOrgAdmin(actor)) return true;
  if (actor.permissions.includes("*")) return true;
  if (actor.permissions.includes(PERMISSIONS.COMMUNICATION_WRITE)) return true;
  if (actor.permissions.includes(PERMISSIONS.COMMUNICATION_MANAGE)) return true;
  return false;
}

/** Process outbound EMAIL queue — admins see all; communicators flush their own sends. */
export function canProcessNotificationQueue(actor: NotificationsActor): boolean {
  return canCreateNotifications(actor);
}
