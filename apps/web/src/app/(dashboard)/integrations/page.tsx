import type { Metadata } from "next";
import { Suspense } from "react";

import { LazyIntegrationsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <Suspense fallback={null}>
      <LazyIntegrationsPage />
    </Suspense>
  );
}
