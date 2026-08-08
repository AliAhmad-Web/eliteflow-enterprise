import type { Metadata } from "next";

import { LazyTeamPage } from "@/components/common/loading/lazy-feature-pages";
import { ProgressiveBoundary } from "@/features/performance";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <ProgressiveBoundary label="Loading Team">
      <LazyTeamPage />
    </ProgressiveBoundary>
  );
}
