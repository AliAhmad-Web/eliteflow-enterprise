import type { Metadata } from "next";

import { LazyStaffRequestsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Work Requests" };

export default function CustomerRequestsPage() {
  return <LazyStaffRequestsPage />;
}
