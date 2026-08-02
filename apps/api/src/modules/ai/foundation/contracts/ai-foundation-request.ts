import type { AiExecutionContext } from "./ai-execution-context.js";

/**
 * Future-ready attachment slot (files, links). Empty in Foundation M1.
 * No processing — structure only.
 */
export interface AiFoundationAttachment {
  readonly id: string;
  readonly kind: string;
  readonly label?: string;
  readonly mimeType?: string;
  readonly uri?: string;
}

/**
 * Opaque request metadata bag for future stages (tracing, client hints).
 * Prefer known keys over free-form growth when stages land.
 */
export type AiFoundationRequestMetadata = Readonly<Record<string, unknown>>;

/**
 * Internal foundation request wrapper.
 * Wraps inbound prompt + execution metadata. No processing.
 */
export interface AiFoundationRequest {
  readonly executionContext: AiExecutionContext;
  readonly prompt: string;
  readonly attachments: readonly AiFoundationAttachment[];
  readonly metadata: AiFoundationRequestMetadata;
}
