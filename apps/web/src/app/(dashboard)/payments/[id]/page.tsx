import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { LazyPaymentDetailsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Payment details" };

export default function PaymentDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading payment" />}>
      <LazyPaymentDetailsPage />
    </Suspense>
  );
}
