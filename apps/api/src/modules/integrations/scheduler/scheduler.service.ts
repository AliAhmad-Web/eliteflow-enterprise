/**
 * Phase 19.4 — Sync Scheduler architecture (config only — no cron executor yet).
 */

import type { Prisma } from "@enterprise/database";
import type {
  SyncSchedulerConfigDto,
  SyncSchedulerPresetValue,
  UpdateSchedulerConfigInput,
} from "@enterprise/shared";

import { logIntegrationsAuditEvent } from "../integrations.audit.js";
import { INTEGRATIONS_AUDIT_ACTIONS } from "../integrations.constants.js";
import { integrationsRepository } from "../integrations.repository.js";
import type {
  IntegrationsActor,
  IntegrationsRequestContext,
} from "../integrations.types.js";
import {
  requireIntegrationAccess,
  requireManage,
} from "../integrations.access.js";

const PRESET_MS: Record<
  Exclude<SyncSchedulerPresetValue, "custom_cron">,
  number
> = {
  every_5_minutes: 5 * 60 * 1000,
  every_15_minutes: 15 * 60 * 1000,
  every_30_minutes: 30 * 60 * 1000,
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

function asConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function computeNextRunAt(
  preset: SyncSchedulerPresetValue,
  cronExpression: string | null,
): string | null {
  if (preset === "custom_cron") {
    void cronExpression;
    return null;
  }
  return new Date(Date.now() + PRESET_MS[preset]).toISOString();
}

function readScheduler(config: Record<string, unknown>): SyncSchedulerConfigDto {
  const raw = asConfig(config.scheduler);
  const preset = (
    typeof raw.preset === "string" ? raw.preset : "hourly"
  ) as SyncSchedulerPresetValue;
  return {
    enabled: raw.enabled === true,
    preset,
    cronExpression:
      typeof raw.cronExpression === "string" ? raw.cronExpression : null,
    nextRunAt: typeof raw.nextRunAt === "string" ? raw.nextRunAt : null,
    lastRunAt: typeof raw.lastRunAt === "string" ? raw.lastRunAt : null,
    architectureOnly: true,
  };
}

export class SchedulerService {
  async get(
    idOrSlug: string,
    actor: IntegrationsActor,
  ): Promise<SyncSchedulerConfigDto> {
    const integration = await requireIntegrationAccess(actor, idOrSlug);
    return readScheduler(asConfig(integration.config));
  }

  async update(
    idOrSlug: string,
    input: UpdateSchedulerConfigInput,
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ): Promise<SyncSchedulerConfigDto> {
    requireManage(actor);
    const integration = await requireIntegrationAccess(actor, idOrSlug);
    const config = asConfig(integration.config);
    const nextRunAt = input.enabled
      ? computeNextRunAt(input.preset, input.cronExpression ?? null)
      : null;

    const previous = asConfig(config.scheduler);
    const scheduler: SyncSchedulerConfigDto = {
      enabled: input.enabled,
      preset: input.preset,
      cronExpression: input.cronExpression ?? null,
      nextRunAt,
      lastRunAt:
        typeof previous.lastRunAt === "string" ? previous.lastRunAt : null,
      architectureOnly: true,
    };

    config.scheduler = scheduler;
    config.phase = "19.4";

    await integrationsRepository.updateConnection(integration.id, {
      config: config as Prisma.InputJsonValue,
    });

    await integrationsRepository.createLog({
      integrationId: integration.id,
      level: "INFO",
      action: "scheduler_updated",
      message: `Scheduler ${input.enabled ? "enabled" : "disabled"} (${input.preset}). Architecture only — executor deferred.`,
      metadata: { phase: "19.4", scheduler },
      userId: actor.userId,
    });

    await logIntegrationsAuditEvent({
      userId: actor.userId,
      action: INTEGRATIONS_AUDIT_ACTIONS.SCHEDULER_UPDATED,
      resourceId: integration.id,
      metadata: { phase: "19.4", kind: "scheduler_update", ...scheduler },
      context,
    });

    return scheduler;
  }
}

export const schedulerService = new SchedulerService();
