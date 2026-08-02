import type { AiAssistModeValue } from "@enterprise/shared";

import type { AiGenerateParams } from "../../providers/ai-provider.js";
import type { AiProviderRequest } from "../contracts/ai-provider-request.js";

const ASSIST_MODES: ReadonlySet<string> = new Set([
  "ASK",
  "EMAIL",
  "PROPOSAL",
  "SUMMARIZE",
  "ANALYZE",
  "IMPROVE",
  "MEETING_NOTES",
  "PROJECT_SUMMARY",
]);

function resolveMode(
  mode: string | undefined,
  fallback?: AiAssistModeValue,
): AiAssistModeValue {
  if (mode && ASSIST_MODES.has(mode)) {
    return mode as AiAssistModeValue;
  }
  if (fallback && ASSIST_MODES.has(fallback)) {
    return fallback;
  }
  return "ASK";
}

/**
 * Map Foundation AiProviderRequest onto existing AiGenerateParams.
 * Does not change provider contracts.
 *
 * - prompt / mode / history come from providerRequest (engineered sections preferred)
 * - systemInstructions remain activated via mode → getSystemInstructions inside providers
 * - runtimeInstructions travel as a SYSTEM history turn (existing provider channel)
 */
export function toAiGenerateParams(
  request: AiProviderRequest,
  fallbackMode?: AiAssistModeValue,
): AiGenerateParams {
  const engineered = request.engineeredPrompt;
  const mode = resolveMode(request.mode, fallbackMode);
  const prompt = engineered?.userPrompt ?? request.prompt;
  const sourceHistory = engineered?.history ?? request.history;

  const history: NonNullable<AiGenerateParams["history"]> = [];

  const runtime = engineered?.runtimeInstructions?.trim();
  if (runtime) {
    history.push({ role: "SYSTEM", content: runtime });
  }

  for (const message of sourceHistory) {
    history.push({
      role: message.role,
      content: message.content,
    });
  }

  return {
    mode,
    prompt,
    history,
  };
}
