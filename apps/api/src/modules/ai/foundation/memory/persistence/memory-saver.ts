/**
 * Memory saver — batched / background persistence of runtime memory entries.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import { freezeMemoryEntry } from "../memory-entry.js";
import { aiDataPolicyService } from "../../policy/ai-data-policy.service.js";
import { promptSecurityService } from "../../security/index.js";
import { cleanupPersistentMemory } from "./memory-cleanup.js";
import { runMemoryJob } from "./memory-background-jobs.js";
import {
  persistentMemoryProvider,
  type PersistentMemoryProvider,
} from "./persistent-memory-provider.js";
import { planMemorySync } from "./memory-sync.js";

export interface AiSavedMemory {
  readonly savedCount: number;
  readonly memoryKeys: readonly string[];
  readonly deferred: boolean;
  readonly cleanedUp: boolean;
  readonly savedAt: string;
  readonly summary: string;
}

export interface SavePersistentMemoryInput {
  readonly userId: string;
  readonly conversationId?: string | null;
  readonly privacyMode: boolean;
  readonly entries: readonly AiMemoryEntry[];
  readonly background?: boolean;
  readonly runCleanup?: boolean;
  readonly provider?: PersistentMemoryProvider;
}

export async function savePersistentMemory(
  input: SavePersistentMemoryInput,
): Promise<AiSavedMemory> {
  if (input.privacyMode || !input.userId) {
    return Object.freeze({
      savedCount: 0,
      memoryKeys: Object.freeze([]),
      deferred: false,
      cleanedUp: false,
      savedAt: new Date().toISOString(),
      summary: "Memory save skipped.",
    });
  }

  // Never persist RESTRICTED secrets/HR fields in AI memory (always redact on write).
  const scrubbedEntries = aiDataPolicyService.sanitizeAIMemory(
    input.entries,
    aiDataPolicyService.subjectFrom({
      userId: input.userId,
      role: "EMPLOYEE",
      permissions: [],
      explicitRestrictedAccess: false,
    }),
  );

  // Prompt security — reject poisoned / injected memory summaries.
  const securedEntries = scrubbedEntries.map((entry) => {
    const summary = promptSecurityService.assertSafeMemoryWrite(
      entry.summary ?? "",
      {
        userId: input.userId,
        conversationId: input.conversationId ?? null,
        surface: "memory_write",
      },
    );
    return summary === entry.summary
      ? entry
      : freezeMemoryEntry({ ...entry, summary });
  });

  const plan = planMemorySync(securedEntries, { maxBatch: 20 });
  const provider = input.provider ?? persistentMemoryProvider;
  const background = input.background === true;
  let memoryKeys: readonly string[] = Object.freeze([]);
  let cleanedUp = false;

  const job = async (): Promise<void> => {
    memoryKeys = await provider.save({
      userId: input.userId,
      conversationId: input.conversationId,
      entries: plan.toUpsert,
    });
    if (input.runCleanup !== false) {
      await cleanupPersistentMemory({ userId: input.userId });
      cleanedUp = true;
    }
  };

  if (background) {
    // Capture keys asynchronously; state reports deferred save.
    const deferredKeys: string[] = plan.toUpsert.map(
      (e) => `${e.type}:${e.source}`,
    );
    await runMemoryJob(async () => {
      await job();
    }, { background: true });

    return Object.freeze({
      savedCount: plan.toUpsert.length,
      memoryKeys: Object.freeze(deferredKeys),
      deferred: true,
      cleanedUp: false,
      savedAt: new Date().toISOString(),
      summary: `Deferred save of ${plan.toUpsert.length} memories (${plan.summary}).`,
    });
  }

  await job();

  return Object.freeze({
    savedCount: memoryKeys.length,
    memoryKeys,
    deferred: false,
    cleanedUp,
    savedAt: new Date().toISOString(),
    summary: `Saved ${memoryKeys.length} memories (${plan.summary}).`,
  });
}
