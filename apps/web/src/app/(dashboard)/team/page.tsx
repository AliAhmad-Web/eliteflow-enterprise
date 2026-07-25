import type { Metadata } from "next";

import { TeamPageContent } from "@/features/team/components/team-page-content";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return <TeamPageContent />;
}
