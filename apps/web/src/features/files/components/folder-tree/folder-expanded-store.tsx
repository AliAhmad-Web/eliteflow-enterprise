"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type ExpandedStore = {
  subscribe: (listener: () => void) => () => void;
  getExpandedIds: () => ReadonlySet<string>;
};

const FolderExpandedContext = createContext<ExpandedStore | null>(null);

/**
 * Fine-grained expand subscriptions: only nodes whose own expand bit flips re-render.
 */
export function FolderExpandedProvider({
  expandedIds,
  children,
}: {
  expandedIds: ReadonlySet<string>;
  children: ReactNode;
}) {
  const listenersRef = useRef(new Set<() => void>());
  const snapshotRef = useRef(expandedIds);
  snapshotRef.current = expandedIds;

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getExpandedIds = useCallback(() => snapshotRef.current, []);

  useEffect(() => {
    listenersRef.current.forEach((listener) => listener());
  }, [expandedIds]);

  const store = useMemo<ExpandedStore>(
    () => ({ subscribe, getExpandedIds }),
    [subscribe, getExpandedIds],
  );

  return (
    <FolderExpandedContext.Provider value={store}>
      {children}
    </FolderExpandedContext.Provider>
  );
}

export function useFolderNodeExpanded(folderId: string): boolean {
  const store = useContext(FolderExpandedContext);
  return useSyncExternalStore(
    store?.subscribe ?? emptySubscribe,
    () => store?.getExpandedIds().has(folderId) ?? false,
    () => false,
  );
}

function emptySubscribe() {
  return () => undefined;
}
