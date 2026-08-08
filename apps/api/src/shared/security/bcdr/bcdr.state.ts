import type {
  BcdrHealthStatus,
  BcdrRecoveryMode,
  BcdrRecoveryTestResult,
  BcdrServiceHealth,
  BcdrServiceId,
} from "./bcdr.types.js";

interface BcdrRuntimeState {
  manualOverride: boolean;
  manualMode: BcdrRecoveryMode | null;
  lastAutomaticMode: BcdrRecoveryMode;
  lastAutomaticReason: string;
  maintenanceOverrides: Partial<Record<BcdrServiceId, boolean>>;
  lastHealth: BcdrServiceHealth[];
  lastRecoveryTest: BcdrRecoveryTestResult | null;
  degradationSince: Partial<Record<BcdrServiceId, string>>;
}

const state: BcdrRuntimeState = {
  manualOverride: false,
  manualMode: null,
  lastAutomaticMode: "NORMAL",
  lastAutomaticReason: "Initial state",
  maintenanceOverrides: {},
  lastHealth: [],
  lastRecoveryTest: null,
  degradationSince: {},
};

export function getBcdrState(): BcdrRuntimeState {
  return state;
}

export function setManualRecoveryMode(mode: BcdrRecoveryMode | null): void {
  if (mode == null) {
    state.manualOverride = false;
    state.manualMode = null;
    return;
  }
  state.manualOverride = true;
  state.manualMode = mode;
}

export function setAutomaticMode(mode: BcdrRecoveryMode, reason: string): void {
  state.lastAutomaticMode = mode;
  state.lastAutomaticReason = reason;
}

export function setLastHealth(health: BcdrServiceHealth[]): void {
  const now = new Date().toISOString();
  for (const item of health) {
    if (item.status === "HEALTHY") {
      delete state.degradationSince[item.id];
    } else if (!state.degradationSince[item.id]) {
      state.degradationSince[item.id] = now;
    }
  }
  state.lastHealth = health;
}

export function setLastRecoveryTest(result: BcdrRecoveryTestResult): void {
  state.lastRecoveryTest = result;
}

export function setServiceMaintenance(
  serviceId: BcdrServiceId,
  enabled: boolean,
): void {
  if (enabled) {
    state.maintenanceOverrides[serviceId] = true;
  } else {
    delete state.maintenanceOverrides[serviceId];
  }
}

export function effectiveMode(): {
  mode: BcdrRecoveryMode;
  manualOverride: boolean;
  reason: string;
} {
  if (state.manualOverride && state.manualMode) {
    return {
      mode: state.manualMode,
      manualOverride: true,
      reason: "Manual recovery mode override",
    };
  }
  return {
    mode: state.lastAutomaticMode,
    manualOverride: false,
    reason: state.lastAutomaticReason,
  };
}

export function applyMaintenanceOverride(
  serviceId: BcdrServiceId,
  status: BcdrHealthStatus,
): BcdrHealthStatus {
  if (state.maintenanceOverrides[serviceId]) {
    return "MAINTENANCE";
  }
  return status;
}
