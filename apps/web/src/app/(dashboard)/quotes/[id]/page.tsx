import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { LazyQuoteDetailsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Quote details" };

export default function QuoteDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading quote" />}>
      <LazyQuoteDetailsPage />
    </Suspense>
  );
}
