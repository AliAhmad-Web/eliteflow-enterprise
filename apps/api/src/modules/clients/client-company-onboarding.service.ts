import { ClientStatus, prisma } from "@enterprise/database";

import { DEFAULT_CLIENT_ROLE_CODE } from "../auth/auth.constants.js";
import {
  CLIENTS_AUDIT_ACTIONS,
  logClientsAuditEvent,
} from "./clients.audit.js";

export type PortalCompanyLinkResult = {
  companyId: string;
  companyName: string;
  alreadyLinked: boolean;
  createdClient: boolean;
  linkedByEmail: boolean;
};

export type PortalCompanyLinkOptions = {
  /** When false, only email-match existing Client CRM rows — never create. */
  createIfMissing?: boolean;
};

export type PortalCompanyLinkAuditContext = {
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Establishes User.companyId → Client for CLIENT portal accounts.
 *
 * Strategy (safe, no blind duplicates):
 * 1. Already linked to an active Client → no-op
 * 2. Active Client with the same email → link
 * 3. Otherwise create a new ACTIVE Client from the user's profile → link
 *    (skipped when createIfMissing: false — used by production backfill)
 *
 * Does not run for non-CLIENT roles. Call only from signup/OAuth create
 * or explicit admin/backfill paths — not on every /me (so admin unlink sticks).
 */
export async function ensurePortalCompanyLink(
  userId: string,
  audit: PortalCompanyLinkAuditContext = {},
  options: PortalCompanyLinkOptions = {},
): Promise<PortalCompanyLinkResult | null> {
  const createIfMissing = options.createIfMissing !== false;

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      companyId: true,
      role: { select: { code: true } },
      company: {
        select: { id: true, companyName: true, deletedAt: true },
      },
    },
  });

  if (!user || user.role.code !== DEFAULT_CLIENT_ROLE_CODE) {
    return null;
  }

  if (user.companyId && user.company && !user.company.deletedAt) {
    return {
      companyId: user.company.id,
      companyName: user.company.companyName,
      alreadyLinked: true,
      createdClient: false,
      linkedByEmail: false,
    };
  }

  // Soft-deleted or dangling companyId — clear before re-linking.
  if (user.companyId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { companyId: null },
    });
  }

  const email = user.email.trim().toLowerCase();
  const displayName =
    `${user.firstName} ${user.lastName}`.trim() || email.split("@")[0] || "Client";

  const result = await prisma.$transaction(async (tx) => {
    const existingClient = await tx.client.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    if (existingClient) {
      await tx.user.update({
        where: { id: user.id },
        data: { companyId: existingClient.id },
      });
      return {
        companyId: existingClient.id,
        companyName: existingClient.companyName,
        alreadyLinked: false,
        createdClient: false,
        linkedByEmail: true,
      } satisfies PortalCompanyLinkResult;
    }

    if (!createIfMissing) {
      return null;
    }

    const created = await tx.client.create({
      data: {
        companyName: displayName,
        contactName: displayName,
        email,
        status: ClientStatus.ACTIVE,
        createdById: null,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { companyId: created.id },
    });

    return {
      companyId: created.id,
      companyName: created.companyName,
      alreadyLinked: false,
      createdClient: true,
      linkedByEmail: false,
    } satisfies PortalCompanyLinkResult;
  });

  if (!result) {
    return null;
  }

  await logClientsAuditEvent({
    userId: audit.userId ?? user.id,
    action: result.createdClient
      ? CLIENTS_AUDIT_ACTIONS.PORTAL_COMPANY_AUTO_CREATE
      : CLIENTS_AUDIT_ACTIONS.PORTAL_COMPANY_AUTO_LINK,
    resourceId: result.companyId,
    metadata: {
      portalUserId: user.id,
      email,
      createdClient: result.createdClient,
      linkedByEmail: result.linkedByEmail,
      createIfMissing,
    },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
  });

  return result;
}
