import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { LazyQuoteFormPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "New quote" };

export default function QuoteNewPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading quote form" />}>
      <LazyQuoteFormPage />
    </Suspense>
  );
}
