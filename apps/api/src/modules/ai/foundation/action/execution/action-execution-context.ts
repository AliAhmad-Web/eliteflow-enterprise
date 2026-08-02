/**
 * Action execution context — actor + policy signals for service calls.
 * Never bypasses authorization.
 */

import type { AiActiveContext } from "../../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../../contracts/ai-effective-policy.js";

export interface AiActionExecutionActor {
  readonly userId: string;
  readonly role: string;
  readonly email: string;
  readonly permissions: readonly string[];
}

export interface AiActionPermissionSubject {
  readonly role: string;
  readonly permissions: readonly string[];
}

export interface AiActionExecutionContext {
  readonly userId: string | null;
  readonly actor: AiActionExecutionActor | null;
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly permissions: readonly string[];
  readonly mode: string | null;
  readonly prompt: string | null;
  readonly privacyMode: boolean;
}

export function buildActionExecutionContext(input: {
  readonly userId?: string | null;
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly permissions?: readonly string[] | null;
  readonly role?: string | null;
  readonly email?: string | null;
  readonly mode?: string | null;
  readonly prompt?: string | null;
}): AiActionExecutionContext {
  const userId = input.userId?.trim() || null;
  const permissions = Object.freeze([...(input.permissions ?? [])]);
  const role =
    input.role ?? input.activeContext.user?.role ?? "EMPLOYEE";
  const email =
    input.email?.trim() ||
    input.activeContext.user?.email?.trim() ||
    "unknown@eliteflow.local";

  const actor: AiActionExecutionActor | null = userId
    ? Object.freeze({
        userId,
        role,
        email,
        permissions,
      })
    : null;

  return Object.freeze({
    userId,
    actor,
    activeContext: input.activeContext,
    policy: input.policy,
    permissions,
    mode: input.mode ?? null,
    prompt: input.prompt ?? null,
    privacyMode: input.policy.privacyMode === true,
  });
}

export function toPermissionSubject(
  context: AiActionExecutionContext,
): AiActionPermissionSubject | null {
  if (!context.actor) return null;
  return {
    role: context.actor.role,
    permissions: [...context.actor.permissions],
  };
}

export function toServiceActor(
  context: AiActionExecutionContext,
): { userId: string; role: string; email: string } | null {
  if (!context.actor) return null;
  return {
    userId: context.actor.userId,
    role: context.actor.role,
    email: context.actor.email,
  };
}

export function toPrivilegedServiceActor(
  context: AiActionExecutionContext,
): {
  userId: string;
  role: string;
  email: string;
  permissions: string[];
} | null {
  const base = toServiceActor(context);
  if (!base) return null;
  return {
    ...base,
    permissions: [...context.permissions],
  };
}
