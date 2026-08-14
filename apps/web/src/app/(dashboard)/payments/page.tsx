import type { Metadata } from "next";

import { LazyPaymentsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return <LazyPaymentsPage />;
}
