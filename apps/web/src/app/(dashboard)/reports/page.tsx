import type { Metadata } from "next";

import { ReportsPageContent } from "@/features/reports/components/reports-page-content";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return <ReportsPageContent />;
}
