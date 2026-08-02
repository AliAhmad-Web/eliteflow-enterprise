/**
 * Resolved provider/model binding for one pipeline run.
 * Computed by Provider Resolution Stage; not a provider SDK call.
 */
export interface AiResolvedProviderBinding {
  /** Registry provider id (e.g. gemini, openai, mock). */
  readonly providerId: string;
  /**
   * Explicit model override for this run, or null to use the provider’s
   * registered / env default at instantiate time.
   */
  readonly model: string | null;
  /** True when the requested provider was unavailable and fallback was used. */
  readonly usedFallback: boolean;
  /** Provider id requested before fallback (null if none explicitly requested). */
  readonly requestedProviderId: string | null;
  /** Model requested before fallback (null if none). */
  readonly requestedModel: string | null;
}
