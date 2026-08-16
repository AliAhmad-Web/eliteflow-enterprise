/**
 * Customer portal AI page hints.
 * IDs are hints only — existing services enforce company/user scope.
 */

import type { AiPageContextInput } from "@enterprise/shared";
import { UserRole } from "@enterprise/shared";

import type { AiContextEntityRef } from "../contracts/ai-active-context.js";
import type { AiFoundationSurface } from "../contracts/ai-execution-context.js";

export const CUSTOMER_AGENT_ID = "agent.customer";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PATH_ENTITY: readonly {
  prefix: string;
  type: AiContextEntityRef["type"];
}[] = [
  { prefix: "/requests/", type: "request" },
  { prefix: "/quotes/", type: "quote" },
  { prefix: "/payments/", type: "payment" },
  { prefix: "/invoices/", type: "invoice" },
  { prefix: "/projects/", type: "project" },
  { prefix: "/tasks/", type: "task" },
];

function isUuid(value: string | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

function firstPathSegmentId(path: string, prefix: string): string | null {
  if (!path.startsWith(prefix)) return null;
  const rest = path.slice(prefix.length).split(/[/?#]/)[0]?.trim() ?? "";
  return isUuid(rest) ? rest : null;
}

export function isCustomerAiRole(role: string | null | undefined): boolean {
  return String(role ?? "").toUpperCase() === UserRole.CLIENT;
}

export function resolveCustomerPageEntityRefs(
  pageContext: AiPageContextInput | undefined,
): readonly AiContextEntityRef[] {
  if (!pageContext) return [];

  if (pageContext.entityType && isUuid(pageContext.entityId)) {
    return [{ type: pageContext.entityType, id: pageContext.entityId }];
  }

  const path = (pageContext.path ?? "").trim();
  if (!path.startsWith("/")) return [];

  for (const item of PATH_ENTITY) {
    const id = firstPathSegmentId(path, item.prefix);
    if (id) return [{ type: item.type, id }];
  }

  return [];
}

export function customerChatSurface(): AiFoundationSurface {
  return "CUSTOMER";
}
