/** Theme identifiers — mirrors web next-themes ids (minus system). */
export type ThemeId = "light" | "dark" | "emerald" | "sapphire";

export const THEME_IDS: ThemeId[] = ["light", "dark", "emerald", "sapphire"];

export const THEME_LABELS: Record<ThemeId, string> = {
  light: "Light",
  dark: "Dark",
  emerald: "Emerald",
  sapphire: "Sapphire",
};

export const DEFAULT_THEME: ThemeId = "dark";

/** Semantic color tokens mirrored from apps/web/src/app/globals.css */
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
  brandGold: string;
  border: string;
  input: string;
  ring: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarAccent: string;
  sidebarBorder: string;
  navbarBackground: string;
  navbarBorder: string;
  navbarSearch: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  chart6: string;
}

export interface ThemeTokens {
  id: ThemeId;
  colors: ThemeColors;
  radius: number;
  spacing: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    8: number;
  };
  motion: {
    fast: number;
    base: number;
    slow: number;
  };
}

const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const;

const motion = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;

const radius = 12;

export const themes: Record<ThemeId, ThemeTokens> = {
  light: {
    id: "light",
    radius,
    spacing,
    motion,
    colors: {
      background: "#f7f6fb",
      foreground: "#0f1117",
      card: "#ffffff",
      cardForeground: "#0f1117",
      popover: "#ffffff",
      popoverForeground: "#0f1117",
      primary: "#6d28d9",
      primaryForeground: "#ffffff",
      secondary: "#f0eef6",
      secondaryForeground: "#1e1b4b",
      muted: "#f1f0f5",
      mutedForeground: "#6b7280",
      accent: "#efeaf8",
      accentForeground: "#4c1d95",
      destructive: "#dc2626",
      destructiveForeground: "#ffffff",
      success: "#059669",
      successForeground: "#ffffff",
      warning: "#d97706",
      warningForeground: "#ffffff",
      info: "#4f46e5",
      infoForeground: "#ffffff",
      brandGold: "#b45309",
      border: "#e6e3ee",
      input: "#e6e3ee",
      ring: "#7c3aed",
      sidebarBackground: "#ffffff",
      sidebarForeground: "#6b7280",
      sidebarPrimary: "#6d28d9",
      sidebarAccent: "rgba(109, 40, 217, 0.08)",
      sidebarBorder: "#eceaf2",
      navbarBackground: "#ffffff",
      navbarBorder: "#e6e3ee",
      navbarSearch: "#f3f1f7",
      chart1: "#7c3aed",
      chart2: "#4f46e5",
      chart3: "#059669",
      chart4: "#d97706",
      chart5: "#dc2626",
      chart6: "#94a3b8",
    },
  },
  dark: {
    id: "dark",
    radius,
    spacing,
    motion,
    colors: {
      background: "#09090b",
      foreground: "#f4f4f5",
      card: "#111114",
      cardForeground: "#f4f4f5",
      popover: "#16161a",
      popoverForeground: "#f4f4f5",
      primary: "#8b5cf6",
      primaryForeground: "#ffffff",
      secondary: "#18181b",
      secondaryForeground: "#f4f4f5",
      muted: "#18181b",
      mutedForeground: "#a1a1aa",
      accent: "#1c1628",
      accentForeground: "#ede9fe",
      destructive: "#ef4444",
      destructiveForeground: "#ffffff",
      success: "#34d399",
      successForeground: "#052e1c",
      warning: "#fbbf24",
      warningForeground: "#422006",
      info: "#818cf8",
      infoForeground: "#0b1220",
      brandGold: "#f59e0b",
      border: "rgba(255, 255, 255, 0.08)",
      input: "rgba(255, 255, 255, 0.09)",
      ring: "#a78bfa",
      sidebarBackground: "#09090b",
      sidebarForeground: "#a1a1aa",
      sidebarPrimary: "#8b5cf6",
      sidebarAccent: "rgba(139, 92, 246, 0.14)",
      sidebarBorder: "rgba(255, 255, 255, 0.07)",
      navbarBackground: "#09090b",
      navbarBorder: "rgba(255, 255, 255, 0.07)",
      navbarSearch: "rgba(255, 255, 255, 0.045)",
      chart1: "#8b5cf6",
      chart2: "#818cf8",
      chart3: "#34d399",
      chart4: "#fbbf24",
      chart5: "#f87171",
      chart6: "#71717a",
    },
  },
  emerald: {
    id: "emerald",
    radius,
    spacing,
    motion,
    colors: {
      background: "#f4faf7",
      foreground: "#0b1f17",
      card: "#ffffff",
      cardForeground: "#0b1f17",
      popover: "#ffffff",
      popoverForeground: "#0b1f17",
      primary: "#047857",
      primaryForeground: "#ecfdf5",
      secondary: "#e8f5ef",
      secondaryForeground: "#065f46",
      muted: "#e8f5ef",
      mutedForeground: "#4d6b5f",
      accent: "#e8f5ef",
      accentForeground: "#065f46",
      destructive: "#dc2626",
      destructiveForeground: "#ffffff",
      success: "#059669",
      successForeground: "#ffffff",
      warning: "#d97706",
      warningForeground: "#ffffff",
      info: "#0d9488",
      infoForeground: "#ffffff",
      brandGold: "#b45309",
      border: "#d7ebe2",
      input: "#d7ebe2",
      ring: "#047857",
      sidebarBackground: "#ffffff",
      sidebarForeground: "#4d6b5f",
      sidebarPrimary: "#047857",
      sidebarAccent: "rgba(4, 120, 87, 0.09)",
      sidebarBorder: "#dff0e8",
      navbarBackground: "#ffffff",
      navbarBorder: "#d7ebe2",
      navbarSearch: "#eef8f3",
      chart1: "#047857",
      chart2: "#0d9488",
      chart3: "#2563eb",
      chart4: "#d97706",
      chart5: "#dc2626",
      chart6: "#94a3b8",
    },
  },
  sapphire: {
    id: "sapphire",
    radius,
    spacing,
    motion,
    colors: {
      background: "#f5f8fc",
      foreground: "#0b1220",
      card: "#ffffff",
      cardForeground: "#0b1220",
      popover: "#ffffff",
      popoverForeground: "#0b1220",
      primary: "#1d4ed8",
      primaryForeground: "#eff6ff",
      secondary: "#e8eef9",
      secondaryForeground: "#1e3a8a",
      muted: "#e8eef9",
      mutedForeground: "#5b6b85",
      accent: "#e8eef9",
      accentForeground: "#1e3a8a",
      destructive: "#dc2626",
      destructiveForeground: "#ffffff",
      success: "#059669",
      successForeground: "#ffffff",
      warning: "#d97706",
      warningForeground: "#ffffff",
      info: "#2563eb",
      infoForeground: "#ffffff",
      brandGold: "#b45309",
      border: "#d8e2f0",
      input: "#d8e2f0",
      ring: "#1d4ed8",
      sidebarBackground: "#ffffff",
      sidebarForeground: "#5b6b85",
      sidebarPrimary: "#1d4ed8",
      sidebarAccent: "rgba(29, 78, 216, 0.09)",
      sidebarBorder: "#e2eaf6",
      navbarBackground: "#ffffff",
      navbarBorder: "#d8e2f0",
      navbarSearch: "#eef3fa",
      chart1: "#1d4ed8",
      chart2: "#0ea5e9",
      chart3: "#059669",
      chart4: "#d97706",
      chart5: "#dc2626",
      chart6: "#94a3b8",
    },
  },
};
