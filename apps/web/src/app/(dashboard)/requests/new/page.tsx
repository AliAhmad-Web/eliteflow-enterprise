import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { LazyRequestNewPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "New request" };

export default function RequestNewPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading form" />}>
      <LazyRequestNewPage />
    </Suspense>
  );
}
