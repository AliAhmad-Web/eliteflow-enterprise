"use client";

import { createContext, useContext } from "react";

/**
 * Per keep-alive slot: is this cached page the one currently visible?
 * Hidden slots stay mounted; consumers must pause polls/heartbeats when inactive.
 */
const KeepAlivePageActiveContext = createContext(true);

export function KeepAlivePageActiveProvider({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <KeepAlivePageActiveContext.Provider value={active}>
      {children}
    </KeepAlivePageActiveContext.Provider>
  );
}

/** True when not under keep-alive, or when this keep-alive page is visible. */
export function useIsKeepAlivePageActive(): boolean {
  return useContext(KeepAlivePageActiveContext);
}
