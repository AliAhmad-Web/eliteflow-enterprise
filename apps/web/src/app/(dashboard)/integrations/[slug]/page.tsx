import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { IntegrationDetailPageContent } from "@/features/integrations/components/integration-detail-page-content";

export default function IntegrationDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading integration" />}>
      <IntegrationDetailPageContent />
    </Suspense>
  );
}
