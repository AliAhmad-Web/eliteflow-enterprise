import type { Metadata } from "next";

import { LazyProjectsPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <LazyProjectsPage />;
}
