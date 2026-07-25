import type {
  AiProvider,
  AiGenerateParams,
  AiGenerateResult,
  AiStreamHandlers,
} from "./ai-provider.js";

/**
 * Claude — future provider.
 * Registered in the AI provider registry with isLive=false until Anthropic
 * credentials and API wiring are enabled. Enabling requires flipping isLive
 * and completing this implementation — no factory rewrite.
 */
export class ClaudeProvider implements AiProvider {
  readonly name = "claude";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generate(_params: AiGenerateParams): Promise<AiGenerateResult> {
    void this.apiKey;
    void this.model;
    throw new Error(
      "Claude AI is registered but not enabled yet. Gemini remains the default provider.",
    );
  }

  async generateStream(
    params: AiGenerateParams,
    handlers?: AiStreamHandlers,
  ): Promise<AiGenerateResult> {
    const result = await this.generate(params);
    await handlers?.onDelta?.(result.content);
    return result;
  }
}
