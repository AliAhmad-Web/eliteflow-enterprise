/**
 * Built-in n8n Automation Provider.
 * Automation engine only — never owns EliteFlow business decisions.
 * No live n8n instance required.
 */

import type { AiAutomationProvider } from "./automation-provider.js";
import type { AiAutomationProviderDefinition } from "./automation-provider-definition.js";
import type { AiAutomationProviderContext } from "./automation-provider-context.js";
import type { AiAutomationRequest } from "./automation-request.js";
import type { AiAutomationResponse } from "./automation-response.js";
import { cancelN8nStub, dispatchN8nStub } from "./n8n-client.js";
import { createAutomationError } from "./automation-errors.js";

export const N8N_PROVIDER_ID = "automation.provider.n8n";

export const N8N_PROVIDER_DEFINITION: AiAutomationProviderDefinition =
  Object.freeze({
    id: N8N_PROVIDER_ID,
    kind: "n8n",
    name: "n8n Provider",
    description:
      "EliteFlow n8n automation adapter — external workflow engine only.",
    version: "1.0",
    supportsAsync: true,
    supportsBackground: true,
    supportsCallback: true,
    supportsCancel: true,
    supportsRetry: true,
    enabled: true,
  });

function sanitize(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function createN8nProvider(): AiAutomationProvider {
  return Object.freeze({
    definition: N8N_PROVIDER_DEFINITION,
    async trigger(
      request: AiAutomationRequest,
      context: AiAutomationProviderContext,
    ): Promise<AiAutomationResponse> {
      if (!context.enableN8n) {
        return Object.freeze({
          requestId: request.requestId,
          providerId: N8N_PROVIDER_ID,
          externalExecutionId: null,
          status: "skipped",
          mode: request.mode,
          summary: sanitize("n8n integration disabled"),
          durationMs: 0,
          callbackExpected: false,
          cancelled: false,
          timedOut: false,
          error: createAutomationError(
            "provider_disabled",
            "AI_N8N_INTEGRATION is disabled",
          ),
          completedAt: new Date().toISOString(),
        });
      }

      const started = Date.now();
      const dispatch = await dispatchN8nStub(request, context);
      const durationMs = Date.now() - started;
      const timedOut = dispatch.result.status === "timeout";

      return Object.freeze({
        requestId: request.requestId,
        providerId: N8N_PROVIDER_ID,
        externalExecutionId: dispatch.execution.executionId,
        status: dispatch.result.status,
        mode: request.mode,
        summary: dispatch.result.summary,
        durationMs,
        callbackExpected: dispatch.result.callbackPending,
        cancelled: false,
        timedOut,
        ...(timedOut
          ? {
              error: createAutomationError(
                "timeout",
                "n8n stub timed out",
                true,
              ),
            }
          : {}),
        completedAt:
          dispatch.result.status === "awaiting_callback" ||
          dispatch.result.status === "queued" ||
          dispatch.result.status === "background"
            ? null
            : new Date().toISOString(),
      });
    },
    async cancel(
      externalExecutionId: string,
      _context: AiAutomationProviderContext,
    ): Promise<boolean> {
      return cancelN8nStub(externalExecutionId);
    },
  });
}

export const n8nAutomationProvider = createN8nProvider();
