import { memo, type ComponentType, type MemoExoticComponent } from "react";

import { isPerformanceMemoizationEnabled } from "../feature-flags";

/**
 * Conditionally wraps a component with React.memo when PERFORMANCE_MEMOIZATION is ON.
 * When OFF, returns the original component (no memo).
 *
 * NEXT_PUBLIC flags are build-time; toggle requires rebuild/restart.
 */
export function maybeMemo<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (
    prevProps: Readonly<P>,
    nextProps: Readonly<P>,
  ) => boolean,
): ComponentType<P> | MemoExoticComponent<ComponentType<P>> {
  if (!isPerformanceMemoizationEnabled()) {
    return Component;
  }
  return memo(Component, propsAreEqual);
}
