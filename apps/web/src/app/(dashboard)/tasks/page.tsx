import type { Metadata } from "next";

import { LazyTasksPage } from "@/components/common/loading/lazy-feature-pages";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return <LazyTasksPage />;
}
