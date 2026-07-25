"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { getQueryClient } from "@/services/api/query-client";

interface QueryProviderProps {
  children: React.ReactNode;
}

/** Browser singleton QueryClient — survives soft nav and provider remounts. */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
