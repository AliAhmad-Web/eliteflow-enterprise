import type {
  AiFinishReason,
  AiFoundationResponse,
  AiFoundationTokenUsage,
} from "../contracts/ai-foundation-response.js";
import type { AiProviderRequest } from "../contracts/ai-provider-request.js";
import type { AiResolvedProviderBinding } from "../contracts/ai-resolved-provider-binding.js";

export interface ValidateFoundationResponseInput {
  readonly result: unknown;
  readonly providerRequest?: AiProviderRequest | null;
  readonly providerBinding?: AiResolvedProviderBinding | null;
}

const FINISH_REASONS: readonly AiFinishReason[] = [
  "stop",
  "length",
  "content_filter",
  "error",
  "unknown",
];

function isFinishReason(value: unknown): value is AiFinishReason {
  return (
    typeof value === "string" &&
    (FINISH_REASONS as readonly string[]).includes(value)
  );
}

function normalizeUsage(value: unknown): AiFoundationTokenUsage | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const promptTokens =
    typeof raw.promptTokens === "number" ? raw.promptTokens : undefined;
  const completionTokens =
    typeof raw.completionTokens === "number"
      ? raw.completionTokens
      : undefined;
  const totalTokens =
    typeof raw.totalTokens === "number" ? raw.totalTokens : undefined;

  if (
    promptTokens === undefined &&
    completionTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }

  return { promptTokens, completionTokens, totalTokens };
}

function extractContentAndProvider(result: unknown): {
  content: string;
  provider: string;
  finishReason?: AiFinishReason;
  usage?: AiFoundationTokenUsage;
  providerMetadata?: Record<string, unknown>;
} {
  if (!result || typeof result !== "object") {
    return { content: "", provider: "unknown" };
  }

  const record = result as Record<string, unknown>;

  // Chat DTO shape from AiService.execute*
  const assistantMessage = record.assistantMessage;
  if (assistantMessage && typeof assistantMessage === "object") {
    const message = assistantMessage as Record<string, unknown>;
    const content =
      typeof message.content === "string" ? message.content : "";
    const provider =
      typeof record.provider === "string" && record.provider.trim()
        ? record.provider
        : "unknown";

    return {
      content,
      provider,
      finishReason: isFinishReason(record.finishReason)
        ? record.finishReason
        : undefined,
      usage: normalizeUsage(record.usage),
      providerMetadata:
        record.providerMetadata && typeof record.providerMetadata === "object"
          ? { ...(record.providerMetadata as Record<string, unknown>) }
          : undefined,
    };
  }

  // Direct content payload (documents / future adapters)
  if (typeof record.content === "string") {
    const provider =
      typeof record.provider === "string" && record.provider.trim()
        ? record.provider
        : "unknown";
    return {
      content: record.content,
      provider,
      finishReason: isFinishReason(record.finishReason)
        ? record.finishReason
        : undefined,
      usage: normalizeUsage(record.usage),
      providerMetadata:
        record.providerMetadata && typeof record.providerMetadata === "object"
          ? { ...(record.providerMetadata as Record<string, unknown>) }
          : undefined,
    };
  }

  return { content: "", provider: "unknown" };
}

function resolveFinishReason(
  extracted: ReturnType<typeof extractContentAndProvider>,
): AiFinishReason {
  if (extracted.finishReason) return extracted.finishReason;
  // Empty body is still returned unchanged; classify metadata only.
  if (extracted.content.length === 0) return "unknown";
  return "stop";
}

/**
 * Validate provider result structure and normalize metadata into AiFoundationResponse.
 * Does not rewrite or truncate response content.
 */
export function validateFoundationResponse(
  input: ValidateFoundationResponseInput,
): AiFoundationResponse {
  if (input.result === undefined || input.result === null) {
    throw new Error(
      "AI response validation failed: provider result is missing",
    );
  }

  const extracted = extractContentAndProvider(input.result);
  const finishReason = resolveFinishReason(extracted);

  const providerMetadata: Record<string, unknown> = {
    ...(extracted.providerMetadata ?? {}),
    provider: extracted.provider,
  };

  const binding = input.providerBinding ?? input.providerRequest?.providerBinding;
  if (binding) {
    providerMetadata.providerId = binding.providerId;
    if (binding.model) providerMetadata.model = binding.model;
    providerMetadata.usedFallback = binding.usedFallback;
  }

  if (input.providerRequest?.streaming !== undefined) {
    providerMetadata.streaming = input.providerRequest.streaming;
  }

  return {
    content: extracted.content,
    usage: extracted.usage,
    finishReason,
    providerMetadata,
  };
}
