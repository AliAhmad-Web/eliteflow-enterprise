import type { Metadata } from "next";

import { LazyDashboardPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <LazyDashboardPage />;
}
