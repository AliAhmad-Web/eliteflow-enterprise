import type { Metadata } from "next";

import { TasksPageContent } from "@/features/tasks/components/tasks-page-content";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return <TasksPageContent />;
}
