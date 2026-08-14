import type { Metadata } from "next";

import { LazyQuotesPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Quotes" };

export default function QuotesPage() {
  return <LazyQuotesPage />;
}
