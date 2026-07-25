import * as React from "react";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-lg bg-muted/70",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
