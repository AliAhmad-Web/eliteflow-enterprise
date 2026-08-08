import type { Metadata } from "next";

import { LazySecurityPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Security Center" };

export default function SecurityPage() {
  return <LazySecurityPage />;
}
