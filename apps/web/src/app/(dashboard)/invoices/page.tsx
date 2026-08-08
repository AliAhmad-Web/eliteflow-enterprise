import type { Metadata } from "next";

import { LazyInvoicesPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return <LazyInvoicesPage />;
}
