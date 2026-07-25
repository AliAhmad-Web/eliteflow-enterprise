import type { Metadata } from "next";
import { Suspense } from "react";

import { IntegrationsCenterPageContent } from "@/features/integrations";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <Suspense fallback={null}>
      <IntegrationsCenterPageContent />
    </Suspense>
  );
}
