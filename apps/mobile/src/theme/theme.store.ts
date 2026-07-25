import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import {
  DEFAULT_THEME,
  THEME_IDS,
  themes,
  type ThemeId,
  type ThemeTokens,
} from "./tokens";

const THEME_STORAGE_KEY = "eliteflow-mobile-theme";

interface ThemeStore {
  themeId: ThemeId;
  theme: ThemeTokens;
  isHydrated: boolean;
  setTheme: (id: ThemeId) => void;
  hydrate: () => Promise<void>;
}

function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as string[]).includes(value);
}

export const useThemeStore = create<ThemeStore>((set) => ({
  themeId: DEFAULT_THEME,
  theme: themes[DEFAULT_THEME],
  isHydrated: false,

  setTheme: (id) => {
    void AsyncStorage.setItem(THEME_STORAGE_KEY, id);
    set({ themeId: id, theme: themes[id] });
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored && isThemeId(stored)) {
        set({ themeId: stored, theme: themes[stored], isHydrated: true });
        return;
      }
    } catch {
      // Fall through to default
    }
    set({ isHydrated: true });
  },
}));

export function useTheme(): ThemeTokens {
  return useThemeStore((s) => s.theme);
}

export function useThemeColors() {
  return useThemeStore((s) => s.theme.colors);
}
