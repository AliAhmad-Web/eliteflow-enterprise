import type { Metadata } from "next";

import { LazyActivityPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return <LazyActivityPage />;
}
