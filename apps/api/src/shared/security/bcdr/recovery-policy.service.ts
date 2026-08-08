import type { RecoveryCapabilities } from "./bcdr.types.js";
import {
  capabilitiesForMode,
} from "./bcdr.policies.js";
import {
  applyMaintenanceOverride,
  effectiveMode,
  getBcdrState,
} from "./bcdr.state.js";
import type { BcdrHealthStatus, BcdrServiceId } from "./bcdr.types.js";

/**
 * Central recovery policy — modules must query this instead of
 * implementing their own failover logic.
 */
class RecoveryPolicyService {
  getMode() {
    return effectiveMode();
  }

  getCapabilities(): RecoveryCapabilities {
    const { mode, reason } = effectiveMode();
    const caps = capabilitiesForMode(mode);
    return { ...caps, reason };
  }

  /** Whether mutating business writes are permitted. */
  allowWrites(): boolean {
    return this.getCapabilities().allowWrites;
  }

  allowFileUploads(): boolean {
    return this.getCapabilities().allowFileUploads;
  }

  allowAi(): boolean {
    const caps = this.getCapabilities();
    if (!caps.allowAi) return false;
    const ai = this.latestServiceStatus("ai_providers");
    return ai !== "UNAVAILABLE" && ai !== "MAINTENANCE";
  }

  /**
   * Email send vs queue-only.
   * When email is UNAVAILABLE, callers should queue notifications (NORMAL mode).
   */
  allowEmailSend(): boolean {
    const caps = this.getCapabilities();
    if (!caps.allowEmailSend) return false;
    const email = this.latestServiceStatus("email_service");
    return email === "HEALTHY" || email === "DEGRADED";
  }

  shouldQueueNotificationsOnly(): boolean {
    const caps = this.getCapabilities();
    if (caps.queueNotificationsOnly) return true;
    const email = this.latestServiceStatus("email_service");
    return email === "UNAVAILABLE" || email === "MAINTENANCE";
  }

  allowBackgroundJobs(): boolean {
    return this.getCapabilities().allowBackgroundJobs;
  }

  isDisasterRecovery(): boolean {
    return this.getMode().mode === "DISASTER_RECOVERY";
  }

  isReadOnly(): boolean {
    const mode = this.getMode().mode;
    return mode === "READ_ONLY" || mode === "DISASTER_RECOVERY";
  }

  private latestServiceStatus(id: BcdrServiceId): BcdrHealthStatus {
    const row = getBcdrState().lastHealth.find((h) => h.id === id);
    const status = row?.status ?? "HEALTHY";
    return applyMaintenanceOverride(id, status);
  }
}

export const recoveryPolicyService = new RecoveryPolicyService();
