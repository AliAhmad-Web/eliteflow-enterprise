"use client";

import { useEffect } from "react";

import { useUiStore } from "@/stores/ui.store";

/**
 * Rehydrate persisted UI prefs after mount so SSR HTML matches the first
 * client render (zustand persist skipHydration).
 */
export function UiStoreHydration() {
  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  return null;
}
