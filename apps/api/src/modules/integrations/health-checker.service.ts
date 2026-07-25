import type { Integration, IntegrationHealthStatus } from "@enterprise/database";

import { credentialManager } from "./credential-manager.service.js";
import { integrationsRepository } from "./integrations.repository.js";

export interface HealthCheckResult {
  healthy: boolean;
  healthStatus: IntegrationHealthStatus;
  message: string;
}

/**
 * HealthChecker — evaluates connection readiness without calling external APIs.
 * Phase 19.1 verifies encrypted credentials + connection state only.
 */
export class HealthChecker {
  async check(integration: Integration): Promise<HealthCheckResult> {
    if (!integration.isConnected) {
      return {
        healthy: false,
        healthStatus: "UNKNOWN",
        message: "Integration is not connected.",
      };
    }

    const hasCredentials = await credentialManager.hasActiveCredentials(
      integration.id,
    );
    if (!hasCredentials) {
      return {
        healthy: false,
        healthStatus: "UNHEALTHY",
        message: "Connected integration is missing encrypted credentials.",
      };
    }

    // Architecture-only: decryptability proves vault integrity without OAuth.
    try {
      const secret = await credentialManager.decryptActive(integration.id);
      if (!secret) {
        return {
          healthy: false,
          healthStatus: "DEGRADED",
          message: "Credentials exist but connection token could not be resolved.",
        };
      }
    } catch {
      return {
        healthy: false,
        healthStatus: "UNHEALTHY",
        message: "Credential vault decryption failed.",
      };
    }

    return {
      healthy: true,
      healthStatus: "HEALTHY",
      message: "Connection vault and credential integrity verified.",
    };
  }

  async apply(integration: Integration): Promise<{
    result: HealthCheckResult;
    updated: Awaited<ReturnType<typeof integrationsRepository.updateConnection>>;
  }> {
    const result = await this.check(integration);
    const updated = await integrationsRepository.updateConnection(
      integration.id,
      {
        healthStatus: result.healthStatus,
        healthMessage: result.message,
        lastHealthCheckAt: new Date(),
        status: result.healthy
          ? "CONNECTED"
          : integration.isConnected
            ? "ERROR"
            : integration.status,
      },
    );
    return { result, updated };
  }
}

export const healthChecker = new HealthChecker();
