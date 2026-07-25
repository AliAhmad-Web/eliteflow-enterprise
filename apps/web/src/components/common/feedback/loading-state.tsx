import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({
  label = "Loading content",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-border bg-card/50 px-4 py-10 sm:min-h-[280px] sm:px-6 sm:py-12",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size="lg" label={label} />
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
