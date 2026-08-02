/**
 * Automation Provider interface — adapters for external engines.
 * No business logic. EliteFlow AI remains the decision maker.
 */

import type { AiAutomationProviderDefinition } from "./automation-provider-definition.js";
import type { AiAutomationProviderContext } from "./automation-provider-context.js";
import type { AiAutomationRequest } from "./automation-request.js";
import type { AiAutomationResponse } from "./automation-response.js";

export interface AiAutomationProvider {
  readonly definition: AiAutomationProviderDefinition;
  /**
   * Trigger an external automation workflow.
   * Implementations must NOT execute EliteFlow business logic.
   * Stub/adapters may simulate results without real HTTP.
   */
  trigger(
    request: AiAutomationRequest,
    context: AiAutomationProviderContext,
  ): Promise<AiAutomationResponse>;
  /**
   * Optional cancel — no-op when unsupported.
   */
  cancel?(
    externalExecutionId: string,
    context: AiAutomationProviderContext,
  ): Promise<boolean>;
}
