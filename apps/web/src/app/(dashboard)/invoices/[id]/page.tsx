import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { InvoiceDetailsPageContent } from "@/features/invoices/components/invoice-details-page-content";

export const metadata: Metadata = { title: "Invoice details" };

export default function InvoiceDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading invoice" />}>
      <InvoiceDetailsPageContent />
    </Suspense>
  );
}
