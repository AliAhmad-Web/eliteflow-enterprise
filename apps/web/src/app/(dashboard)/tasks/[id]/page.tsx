import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common/feedback/loading-state";
import { TaskDetailsPageContent } from "@/features/tasks/components/task-details-page-content";

export const metadata: Metadata = { title: "Task details" };

export default function TaskDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading task" />}>
      <TaskDetailsPageContent />
    </Suspense>
  );
}
