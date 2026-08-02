/**
 * Normalized internal model output before public DTO mapping.
 * Independent of provider SDKs.
 */

export type AiFinishReason =
  | "stop"
  | "length"
  | "content_filter"
  | "error"
  | "unknown";

export interface AiFoundationTokenUsage {
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;
}

export interface AiFoundationResponse {
  readonly content: string;
  readonly usage?: AiFoundationTokenUsage;
  readonly finishReason?: AiFinishReason;
  /** Provider-specific non-sensitive diagnostics (model id, latency hints, etc.). */
  readonly providerMetadata?: Readonly<Record<string, unknown>>;
}
