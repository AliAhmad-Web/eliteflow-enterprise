/**
 * Tracks which keep-alive route is currently visible.
 * Hidden keep-alive pages stay mounted but must pause polls/heartbeats.
 */
import { create } from "zustand";

interface KeepAliveVisibilityState {
  activeRoute: string | null;
  setActiveRoute: (route: string | null) => void;
}

export const useKeepAliveVisibilityStore = create<KeepAliveVisibilityState>(
  (set) => ({
    activeRoute: null,
    setActiveRoute: (activeRoute) => set({ activeRoute }),
  }),
);

/** True when this route is the visible keep-alive page (or not using keep-alive). */
export function useIsKeepAliveRouteActive(route: string | null): boolean {
  const activeRoute = useKeepAliveVisibilityStore((s) => s.activeRoute);
  if (!route) {
    return true;
  }
  // Outside keep-alive shell (activeRoute null) → page is the Next children tree → active.
  if (activeRoute === null) {
    return true;
  }
  return activeRoute === route;
}
