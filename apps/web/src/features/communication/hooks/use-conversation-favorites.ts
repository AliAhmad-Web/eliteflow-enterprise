"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "eliteflow.communication.favoriteConversations";

type Listener = () => void;

let cachedIds: string[] | null = null;
const listeners = new Set<Listener>();

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  if (cachedIds) return cachedIds;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    cachedIds = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    cachedIds = [];
  }
  return cachedIds;
}

function writeIds(ids: string[]): void {
  cachedIds = ids;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / private mode
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string[] {
  return readIds();
}

function getServerSnapshot(): string[] {
  return [];
}

/**
 * Client-only favorites (conversation pin). Backend has no conversation-level pin.
 */
export function useConversationFavorites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [favoriteSet, setFavoriteSet] = useState(() => new Set(ids));

  useEffect(() => {
    setFavoriteSet(new Set(ids));
  }, [ids]);

  const isFavorite = useCallback(
    (conversationId: string) => favoriteSet.has(conversationId),
    [favoriteSet],
  );

  const toggleFavorite = useCallback((conversationId: string) => {
    const current = readIds();
    const next = current.includes(conversationId)
      ? current.filter((id) => id !== conversationId)
      : [conversationId, ...current];
    writeIds(next);
  }, []);

  return { favoriteIds: ids, isFavorite, toggleFavorite };
}
