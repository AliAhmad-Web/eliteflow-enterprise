"use client";

import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query. Defaults to `false` until mounted to avoid
 * hydration mismatches (server has no viewport).
 */
export function useMediaQuery(query: string, defaultMatches = false) {
  const [matches, setMatches] = useState(defaultMatches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const onChange = () => setMatches(mediaQuery.matches);

    onChange();
    mediaQuery.addEventListener("change", onChange);

    return () => mediaQuery.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
