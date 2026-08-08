/**
 * Per-provider circuit breaker for SIEM delivery.
 */

import type { SiemProvider } from "./siem.types.js";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitEntry {
  state: CircuitState;
  failures: number;
  openedAt: number | null;
  halfOpenProbe: boolean;
}

export class SiemCircuitBreaker {
  private readonly circuits = new Map<SiemProvider, CircuitEntry>();

  constructor(
    private readonly failureThreshold: number,
    private readonly openMs: number,
  ) {}

  private entry(provider: SiemProvider): CircuitEntry {
    let e = this.circuits.get(provider);
    if (!e) {
      e = { state: "CLOSED", failures: 0, openedAt: null, halfOpenProbe: false };
      this.circuits.set(provider, e);
    }
    return e;
  }

  canAttempt(provider: SiemProvider): boolean {
    const e = this.entry(provider);
    if (e.state === "CLOSED") return true;
    if (e.state === "HALF_OPEN") {
      if (e.halfOpenProbe) return false;
      e.halfOpenProbe = true;
      return true;
    }
    // OPEN
    if (e.openedAt != null && Date.now() - e.openedAt >= this.openMs) {
      e.state = "HALF_OPEN";
      e.halfOpenProbe = true;
      return true;
    }
    return false;
  }

  recordSuccess(provider: SiemProvider): void {
    const e = this.entry(provider);
    e.state = "CLOSED";
    e.failures = 0;
    e.openedAt = null;
    e.halfOpenProbe = false;
  }

  recordFailure(provider: SiemProvider): void {
    const e = this.entry(provider);
    e.failures += 1;
    e.halfOpenProbe = false;
    if (e.state === "HALF_OPEN" || e.failures >= this.failureThreshold) {
      e.state = "OPEN";
      e.openedAt = Date.now();
    }
  }

  snapshot(): Array<{
    provider: SiemProvider;
    state: CircuitState;
    failures: number;
  }> {
    return [...this.circuits.entries()].map(([provider, e]) => ({
      provider,
      state: e.state,
      failures: e.failures,
    }));
  }
}
