import { create } from "zustand";

/**
 * Optimistic path updates on click (before Next.js finishes RSC navigation)
 * so KeepAlive can show the target page immediately.
 */
interface NavTransitionState {
  optimisticPath: string | null;
  setOptimisticPath: (path: string | null) => void;
}

export const useNavTransitionStore = create<NavTransitionState>((set) => ({
  optimisticPath: null,
  setOptimisticPath: (optimisticPath) => set({ optimisticPath }),
}));
