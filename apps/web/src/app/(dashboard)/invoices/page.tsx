import type { Metadata } from "next";

import { InvoicesPageContent } from "@/features/invoices/components/invoices-page-content";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return <InvoicesPageContent />;
}
