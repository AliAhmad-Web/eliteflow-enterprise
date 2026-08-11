import type { Metadata } from "next";

import { LazyRequestsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "My Requests" };

export default function RequestsPage() {
  return <LazyRequestsPage />;
}
