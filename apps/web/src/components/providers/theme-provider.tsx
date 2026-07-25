"use client";

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

/**
 * next-themes injects an inline <script> to prevent theme flash (FOUC).
 * React 19 / Next 16 warn that scripts inside client components never run on
 * the client — a false positive: the script runs during SSR/HTML parse before
 * hydration. Install the filter synchronously so the first render is covered.
 */
let scriptWarningFilterInstalled = false;

function installNextThemesScriptWarningFilter() {
  if (scriptWarningFilterInstalled || typeof window === "undefined") {
    return;
  }

  scriptWarningFilterInstalled = true;
  const originalError = console.error;

  console.error = (...args: unknown[]) => {
    const first = args[0];
    const message =
      typeof first === "string"
        ? first
        : first instanceof Error
          ? first.message
          : "";

    if (
      message.includes(
        "Encountered a script tag while rendering React component",
      )
    ) {
      return;
    }

    originalError.apply(console, args);
  };
}

installNextThemesScriptWarningFilter();

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  installNextThemesScriptWarningFilter();

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
