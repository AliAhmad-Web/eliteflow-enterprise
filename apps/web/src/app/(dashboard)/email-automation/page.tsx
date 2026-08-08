import type { Metadata } from "next";

import { LazyEmailAutomationPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Email" };

export default function EmailAutomationPage() {
  return <LazyEmailAutomationPage />;
}
