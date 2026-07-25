import type { Metadata } from "next";

import { ProjectsPageContent } from "@/features/projects/components/projects-page-content";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <ProjectsPageContent />;
}
