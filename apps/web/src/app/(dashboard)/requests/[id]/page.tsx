import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { LazyRequestDetailsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Request details" };

export default function RequestDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading request" />}>
      <LazyRequestDetailsPage />
    </Suspense>
  );
}
