import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { ROUTES } from "@/constants/routes";

interface ModulePlaceholderProps {
  title: string;
  description?: string;
}

export function ModulePlaceholder({
  title,
  description = "This module foundation is ready. Business features will be implemented in the next development phase.",
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader title={title} description={description} />
      <EmptyState
        title={`${title} module`}
        description="The shared UI shell, navigation, and design system are in place. Feature development starts next."
        actionLabel="Back to home"
        actionHref={ROUTES.HOME}
      />
    </div>
  );
}
