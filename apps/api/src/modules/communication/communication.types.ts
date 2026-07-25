import type { UserRole } from "@enterprise/shared";

export type CommunicationActor = {
  userId: string;
  role: UserRole | string;
  email: string;
  permissions: string[];
  companyId?: string | null;
};

export function isOrgAdmin(actor: CommunicationActor): boolean {
  return actor.role === "ADMIN" || actor.role === "SUPER_ADMIN";
}

export function isSuperAdmin(actor: CommunicationActor): boolean {
  return actor.role === "SUPER_ADMIN";
}

export function isClient(actor: CommunicationActor): boolean {
  return actor.role === "CLIENT";
}
