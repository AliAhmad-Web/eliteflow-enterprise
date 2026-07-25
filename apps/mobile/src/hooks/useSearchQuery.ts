import { useCallback, useEffect, useState } from "react";
import { useDeferredValue } from "react";

/** Debounced search input with deferred value for cheap filtering. */
export function useSearchQuery(initial = "", delayMs = 300) {
  const [raw, setRaw] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const deferred = useDeferredValue(debounced);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(raw.trim()), delayMs);
    return () => clearTimeout(id);
  }, [raw, delayMs]);

  const clear = useCallback(() => setRaw(""), []);

  return {
    value: raw,
    setValue: setRaw,
    query: deferred,
    clear,
  };
}
