const DRAFT_PREFIX = "eliteflow.composer.draft.";

export type ComposerDraft = {
  body: string;
  updatedAt: string;
};

export function draftStorageKey(conversationId: string): string {
  return `${DRAFT_PREFIX}${conversationId}`;
}

export function loadComposerDraft(conversationId: string): ComposerDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftStorageKey(conversationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ComposerDraft;
    if (typeof parsed?.body !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveComposerDraft(conversationId: string, body: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!body.trim()) {
      window.localStorage.removeItem(draftStorageKey(conversationId));
      return;
    }
    const payload: ComposerDraft = {
      body,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      draftStorageKey(conversationId),
      JSON.stringify(payload),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearComposerDraft(conversationId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftStorageKey(conversationId));
  } catch {
    // ignore
  }
}
