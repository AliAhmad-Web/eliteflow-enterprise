/**
 * Budget Validation Stage — runs after provider-request, before provider.
 * Provider-independent; no prompt content is stored.
 */

import type { AiPipelineStage } from "./stage.js";
import {
  aiBudgetService,
  AiBudgetBlockedError,
} from "../../budget/ai-budget.service.js";
import { isAiBudgetEnabled } from "../../budget/ai-budget.config.js";
import { estimateTokensFromText } from "../../budget/ai-budget.pricing.js";
import { getAiRuntimeState } from "../../../providers/ai-runtime-config.js";
import type { AiProviderId } from "../../../providers/ai-runtime-config.js";

function resolveModelId(
  providerId: string,
  bindingModel?: string | null,
): string | null {
  if (bindingModel?.trim()) return bindingModel.trim();
  const runtime = getAiRuntimeState();
  const key = providerId.trim().toLowerCase() as AiProviderId;
  return runtime.models[key] ?? null;
}

/**
 * Budget / quota / cost-estimate gate before the LLM call.
 */
export const budgetValidationStage: AiPipelineStage = {
  name: "budget-validation",
  async run(state) {
    if (!isAiBudgetEnabled()) {
      return state;
    }

    const providerId = state.providerBinding?.providerId ?? "unknown";
    const modelId = resolveModelId(
      providerId,
      state.providerBinding?.model ?? null,
    );

    const prompt = state.prompt ?? state.providerRequest?.prompt ?? "";
    const historyTexts = (state.providerHistory ?? []).map((m) => m.content);
    const promptTokens =
      estimateTokensFromText(prompt) +
      historyTexts.reduce((s, t) => s + estimateTokensFromText(t), 0);

    const projectEntity = state.activeContext.entities.find(
      (e) => e.type === "project" || e.type === "PROJECT",
    );
    const departmentEntity = state.activeContext.entities.find(
      (e) => e.type === "department" || e.type === "DEPARTMENT",
    );

    try {
      const validation = await aiBudgetService.assertWithinBudget({
        actor: {
          userId:
            state.userId ?? state.activeContext.user?.userId ?? "anonymous",
          role: state.activeContext.user?.role,
          email: state.activeContext.user?.email,
        },
        providerId,
        modelId,
        tenantId: state.activeContext.organization?.organizationId,
        departmentId: departmentEntity?.id ?? null,
        projectId: projectEntity?.id ?? null,
        conversationId: state.activeContext.conversationId,
        surface: state.activeContext.surface,
        estimatedPromptTokens: promptTokens,
      });

      return {
        ...state,
        budgetValidation: validation,
      };
    } catch (error) {
      if (error instanceof AiBudgetBlockedError) {
        throw error;
      }
      // Fail-open on unexpected budget engine errors (availability).
      return state;
    }
  },
};
