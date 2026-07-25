import type { Metadata } from "next";

import { WorkspacePageClient } from "@/features/dashboard/components/workspace-page-client";

export const metadata: Metadata = {
  title: "My Workspace",
};

export default function WorkspacePage() {
  return <WorkspacePageClient />;
}
