import type { Metadata } from "next";

import { SecurityCenterPageContent } from "@/features/security";

export const metadata: Metadata = { title: "Security Center" };

export default function SecurityPage() {
  return <SecurityCenterPageContent />;
}
