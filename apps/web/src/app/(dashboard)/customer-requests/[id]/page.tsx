import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { LazyStaffRequestDetailsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Work request details" };

export default function CustomerRequestDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading work request" />}>
      <LazyStaffRequestDetailsPage />
    </Suspense>
  );
}
