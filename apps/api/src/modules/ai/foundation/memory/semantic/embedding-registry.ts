/**
 * Embedding provider registry — no remote plugin loading.
 */

import {
  createLocalLexicalEmbeddingProvider,
  defaultEmbeddingProvider,
  type AiEmbeddingProvider,
} from "./embedding-provider.js";

export class AiEmbeddingRegistry {
  private readonly byId = new Map<string, AiEmbeddingProvider>();

  constructor(seed: readonly AiEmbeddingProvider[] = [defaultEmbeddingProvider]) {
    for (const provider of seed) {
      this.byId.set(provider.id, provider);
    }
  }

  register(provider: AiEmbeddingProvider): void {
    this.byId.set(provider.id, provider);
  }

  get(providerId: string): AiEmbeddingProvider | undefined {
    return this.byId.get(providerId);
  }

  getDefault(): AiEmbeddingProvider {
    return this.byId.get("local-lexical") ?? createLocalLexicalEmbeddingProvider();
  }

  list(): readonly AiEmbeddingProvider[] {
    return Object.freeze([...this.byId.values()]);
  }
}

export const enterpriseEmbeddingRegistry = new AiEmbeddingRegistry();
