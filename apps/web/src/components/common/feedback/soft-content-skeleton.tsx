/** Soft pulse placeholder — never a blocking full-page spinner. */
export function SoftContentSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={
        className ??
        "space-y-3 rounded-xl border border-border bg-card/40 p-4"
      }
      aria-hidden
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-lg bg-muted/50"
          style={{ opacity: 1 - i * 0.08 }}
        />
      ))}
    </div>
  );
}
