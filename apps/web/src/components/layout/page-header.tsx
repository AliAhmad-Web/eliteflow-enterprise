import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-[1.625rem] md:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actionLabel ? (
        <Button onClick={onAction} className="w-full shrink-0 touch-target-auto sm:w-auto">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
