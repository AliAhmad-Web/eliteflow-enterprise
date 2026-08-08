import { prisma } from "@enterprise/database";

import { authConfig } from "../../../config/auth.config.js";
import { isEmailConfigured } from "../../../config/email.config.js";
import { getAiProvider } from "../../../modules/ai/providers/index.js";
import { storageProvider } from "../../../modules/files/storage/storage.provider.js";
import {
  getRateLimitRedisHealth,
  pingRateLimitRedis,
} from "../rate-limit/redis-client.js";
import { writeAuditLogSafe } from "../write-audit-log.js";
import {
  BCDR_SERVICE_META,
  allServiceIds,
  computeReadinessScore,
  evaluateAutomaticRecoveryMode,
} from "./bcdr.policies.js";
import {
  applyMaintenanceOverride,
  effectiveMode,
  getBcdrState,
  setAutomaticMode,
  setLastHealth,
} from "./bcdr.state.js";
import type {
  BcdrActiveDegradation,
  BcdrHealthStatus,
  BcdrReadinessSnapshot,
  BcdrServiceHealth,
  BcdrServiceId,
} from "./bcdr.types.js";
async function probeDatabase(): Promise<{
  status: BcdrHealthStatus;
  detail: string | null;
}> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "HEALTHY", detail: null };
  } catch (error) {
    return {
      status: "UNAVAILABLE",
      detail: error instanceof Error ? error.message : "database_unreachable",
    };
  }
}

function probeFileStorage(): {
  status: BcdrHealthStatus;
  detail: string | null;
} {
  try {
    const name = storageProvider.name;
    if (!name) {
      return { status: "DEGRADED", detail: "storage_provider_unnamed" };
    }
    const hasSupabase =
      Boolean(process.env.SUPABASE_URL?.trim()) ||
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
    if (!hasSupabase && name.includes("supabase")) {
      return { status: "DEGRADED", detail: "storage_env_incomplete" };
    }
    return { status: "HEALTHY", detail: `provider=${name}` };
  } catch (error) {
    return {
      status: "UNAVAILABLE",
      detail: error instanceof Error ? error.message : "storage_error",
    };
  }
}

function probeAi(): { status: BcdrHealthStatus; detail: string | null } {
  try {
    const provider = getAiProvider();
    return { status: "HEALTHY", detail: `provider=${provider.name}` };
  } catch (error) {
    // AI unavailable → platform stays NORMAL; feature disabled.
    return {
      status: "UNAVAILABLE",
      detail: error instanceof Error ? error.message : "ai_unavailable",
    };
  }
}

function probeEmail(): { status: BcdrHealthStatus; detail: string | null } {
  if (isEmailConfigured()) {
    return { status: "HEALTHY", detail: "email_configured" };
  }
  return {
    status: "UNAVAILABLE",
    detail: "email_not_configured",
  };
}

function probeBackgroundJobs(): {
  status: BcdrHealthStatus;
  detail: string | null;
} {
  // In-process jobs are started from server.ts; process uptime implies scheduled.
  const uptime = Math.floor(process.uptime());
  if (uptime < 5) {
    return { status: "DEGRADED", detail: "jobs_starting" };
  }
  return {
    status: "HEALTHY",
    detail: "session_cleanup,performance_recalc,retention_processor",
  };
}

async function probeAuthentication(): Promise<{
  status: BcdrHealthStatus;
  detail: string | null;
}> {
  // Auth depends on DB for sessions/users — probe via DB + JWT secret presence.
  const db = await probeDatabase();
  if (db.status === "UNAVAILABLE") {
    return { status: "UNAVAILABLE", detail: "auth_depends_on_database" };
  }
  if (!authConfig.jwtSecret || authConfig.jwtSecret.length < 32) {
    return { status: "DEGRADED", detail: "jwt_secret_not_ready" };
  }
  return { status: "HEALTHY", detail: null };
}

async function probeCache(): Promise<{
  status: BcdrHealthStatus;
  detail: string | null;
}> {
  const redisUrl =
    process.env.RATE_LIMIT_REDIS_URL?.trim() ||
    process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    return {
      status: "HEALTHY",
      detail: "process_local_only",
    };
  }

  const ok = await pingRateLimitRedis();
  const health = getRateLimitRedisHealth();

  if (ok && health.status === "healthy") {
    return { status: "HEALTHY", detail: `redis_${health.mode ?? "standalone"}` };
  }
  if (health.status === "degraded" || health.status === "disabled") {
    return {
      status: "DEGRADED",
      detail: health.detail ?? health.status,
    };
  }
  return {
    status: "UNAVAILABLE",
    detail: health.detail ?? "redis_ping_failed",
  };
}

/**
 * Continuously tracks platform dependency health for BCDR.
 */
class BusinessContinuityService {
  async probeAllServices(): Promise<BcdrServiceHealth[]> {
    const checkedAt = new Date().toISOString();
    const probes: Record<
      BcdrServiceId,
      { status: BcdrHealthStatus; detail: string | null }
    > = {
      database: await probeDatabase(),
      file_storage: probeFileStorage(),
      ai_providers: probeAi(),
      email_service: probeEmail(),
      background_jobs: probeBackgroundJobs(),
      authentication: await probeAuthentication(),
      cache: await probeCache(),
    };

    const previousById = new Map(
      getBcdrState().lastHealth.map((h) => [h.id, h.status] as const),
    );

    const health: BcdrServiceHealth[] = allServiceIds().map((id) => {
      const meta = BCDR_SERVICE_META[id];
      const raw = probes[id];
      const status = applyMaintenanceOverride(id, raw.status);
      return {
        id,
        label: meta.label,
        status,
        critical: meta.critical,
        detail: status === "MAINTENANCE" ? "manual_maintenance" : raw.detail,
        checkedAt,
      };
    });

    for (const item of health) {
      const previous = previousById.get(item.id);
      if (previous !== undefined && previous !== item.status) {
        void writeAuditLogSafe(
          {
            userId: null,
            action: "business_continuity.health_transition",
            resource: "business_continuity",
            metadata: {
              serviceId: item.id,
              previousStatus: previous,
              status: item.status,
              detail: item.detail,
            },
          },
          "bcdr",
        );
      }
    }

    setLastHealth(health);

    const healthMap = Object.fromEntries(
      health.map((h) => [h.id, h.status]),
    ) as Record<BcdrServiceId, BcdrHealthStatus>;

    const previousMode = getBcdrState().lastAutomaticMode;
    const automatic = evaluateAutomaticRecoveryMode(healthMap);
    setAutomaticMode(automatic.mode, automatic.reason);

    if (
      previousMode !== automatic.mode &&
      !getBcdrState().manualOverride
    ) {
      void writeAuditLogSafe(
        {
          userId: null,
          action: "business_continuity.recovery_mode_changed",
          resource: "business_continuity",
          metadata: {
            previousMode,
            recoveryMode: automatic.mode,
            manualOverride: false,
            reason: automatic.reason,
          },
        },
        "bcdr",
      );
    }

    return health;
  }

  async getServices(): Promise<BcdrServiceHealth[]> {
    return this.probeAllServices();
  }

  async getStatus(): Promise<BcdrReadinessSnapshot> {
    const serviceHealth = await this.probeAllServices();
    const modeInfo = effectiveMode();
    const state = getBcdrState();

    const activeDegradations: BcdrActiveDegradation[] = serviceHealth
      .filter((s) => s.status !== "HEALTHY")
      .map((s) => ({
        serviceId: s.id,
        status: s.status,
        detail: s.detail,
        since: state.degradationSince[s.id] ?? s.checkedAt,
      }));

    const criticalDependencies = serviceHealth
      .filter((s) => s.critical)
      .map((s) => s.id);

    const score = computeReadinessScore(serviceHealth.map((s) => s.status));

    return {
      recoveryMode: modeInfo.mode,
      manualOverride: modeInfo.manualOverride,
      serviceHealth,
      criticalDependencies,
      activeDegradations,
      lastRecoveryTestAt: state.lastRecoveryTest?.testedAt ?? null,
      lastRecoveryTestPassed: state.lastRecoveryTest?.passed ?? null,
      recoveryReadinessScore: score,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export const businessContinuityService = new BusinessContinuityService();
