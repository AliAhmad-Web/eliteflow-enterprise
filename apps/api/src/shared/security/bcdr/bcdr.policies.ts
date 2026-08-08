import type {
  BcdrHealthStatus,
  BcdrRecoveryMode,
  BcdrServiceId,
  RecoveryCapabilities,
} from "./bcdr.types.js";
import { BCDR_SERVICE_IDS } from "./bcdr.types.js";

export const BCDR_SERVICE_META: Record<
  BcdrServiceId,
  { label: string; critical: boolean }
> = {
  database: { label: "Database", critical: true },
  file_storage: { label: "File Storage", critical: true },
  ai_providers: { label: "AI Providers", critical: false },
  email_service: { label: "Email Service", critical: false },
  background_jobs: { label: "Background Jobs", critical: false },
  authentication: { label: "Authentication", critical: true },
  cache: { label: "Cache", critical: false },
};

/** Rank for comparing health severity (higher = worse). */
export function healthRank(status: BcdrHealthStatus): number {
  switch (status) {
    case "HEALTHY":
      return 0;
    case "MAINTENANCE":
      return 1;
    case "DEGRADED":
      return 2;
    case "UNAVAILABLE":
      return 3;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Evaluate automatic recovery mode from service health map.
 *
 * Database unavailable → DISASTER_RECOVERY
 * Storage unavailable → LIMITED_OPERATION
 * Auth unavailable → DISASTER_RECOVERY
 * AI / Email unavailable → stay NORMAL (feature disabled / queue)
 */
export function evaluateAutomaticRecoveryMode(
  healthByService: Record<BcdrServiceId, BcdrHealthStatus>,
): { mode: BcdrRecoveryMode; reason: string } {
  if (healthByService.database === "UNAVAILABLE") {
    return {
      mode: "DISASTER_RECOVERY",
      reason: "Database unavailable",
    };
  }

  if (healthByService.authentication === "UNAVAILABLE") {
    return {
      mode: "DISASTER_RECOVERY",
      reason: "Authentication unavailable",
    };
  }

  if (healthByService.file_storage === "UNAVAILABLE") {
    return {
      mode: "LIMITED_OPERATION",
      reason: "File storage unavailable",
    };
  }

  if (
    healthByService.database === "DEGRADED" ||
    healthByService.authentication === "DEGRADED" ||
    healthByService.file_storage === "DEGRADED"
  ) {
    return {
      mode: "READ_ONLY",
      reason: "Critical dependency degraded",
    };
  }

  if (
    healthByService.database === "MAINTENANCE" ||
    healthByService.authentication === "MAINTENANCE"
  ) {
    return {
      mode: "READ_ONLY",
      reason: "Critical dependency in maintenance",
    };
  }

  // AI / email / jobs / cache failures do not escalate platform mode.
  return {
    mode: "NORMAL",
    reason: "All critical dependencies healthy (non-critical may be degraded)",
  };
}

export function capabilitiesForMode(mode: BcdrRecoveryMode): RecoveryCapabilities {
  switch (mode) {
    case "NORMAL":
      return {
        allowWrites: true,
        allowFileUploads: true,
        allowAi: true,
        allowEmailSend: true,
        allowBackgroundJobs: true,
        queueNotificationsOnly: false,
        mode,
        reason: "Normal operations",
      };
    case "READ_ONLY":
      return {
        allowWrites: false,
        allowFileUploads: false,
        allowAi: true,
        allowEmailSend: true,
        allowBackgroundJobs: true,
        queueNotificationsOnly: false,
        mode,
        reason: "Read-only recovery mode",
      };
    case "LIMITED_OPERATION":
      return {
        allowWrites: true,
        allowFileUploads: false,
        allowAi: true,
        allowEmailSend: true,
        allowBackgroundJobs: true,
        queueNotificationsOnly: false,
        mode,
        reason: "Limited operation — file uploads disabled",
      };
    case "DISASTER_RECOVERY":
      return {
        allowWrites: false,
        allowFileUploads: false,
        allowAi: false,
        allowEmailSend: false,
        allowBackgroundJobs: false,
        queueNotificationsOnly: true,
        mode,
        reason: "Disaster recovery — essential reads only",
      };
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/** Compute readiness score 0–100 from health statuses. */
export function computeReadinessScore(
  statuses: BcdrHealthStatus[],
): number {
  if (statuses.length === 0) return 0;
  let points = 0;
  for (const status of statuses) {
    switch (status) {
      case "HEALTHY":
        points += 100;
        break;
      case "MAINTENANCE":
        points += 70;
        break;
      case "DEGRADED":
        points += 40;
        break;
      case "UNAVAILABLE":
        points += 0;
        break;
      default: {
        const _exhaustive: never = status;
        return _exhaustive;
      }
    }
  }
  return Math.round(points / statuses.length);
}

export function allServiceIds(): BcdrServiceId[] {
  return [...BCDR_SERVICE_IDS];
}
