import type { AiAssistModeValue, AiDocumentTypeValue } from "@enterprise/shared";

export interface AiGenerateParams {
  mode: AiAssistModeValue | "DOCUMENT";
  documentType?: AiDocumentTypeValue;
  prompt: string;
  /** Prior turns for multi-message context (oldest → newest). */
  history?: Array<{ role: "USER" | "ASSISTANT" | "SYSTEM"; content: string }>;
}

export interface AiGenerateResult {
  content: string;
  provider: string;
}

export interface AiStreamHandlers {
  onDelta?: (chunk: string) => void | Promise<void>;
}

export interface AiProvider {
  readonly name: string;
  generate(params: AiGenerateParams): Promise<AiGenerateResult>;
  /**
   * Optional streaming generation. Providers without native streaming
   * may emulate deltas and still return the full result.
   */
  generateStream?(
    params: AiGenerateParams,
    handlers?: AiStreamHandlers,
  ): Promise<AiGenerateResult>;
}
