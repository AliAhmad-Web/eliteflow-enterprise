import type { Metadata } from "next";

import { ProgressiveBoundary } from "@/features/performance";
import { TeamPageContentGate } from "@/features/team/components/team-page-content-gate";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <ProgressiveBoundary label="Loading Team">
      <TeamPageContentGate />
    </ProgressiveBoundary>
  );
}
