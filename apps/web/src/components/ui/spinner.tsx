import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const;

function Spinner({
  size = "md",
  label = "Loading",
  className,
  ...props
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="inline-flex items-center justify-center"
    >
      <Loader2
        className={cn("animate-spin text-primary", sizeMap[size], className)}
        aria-hidden="true"
        {...props}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export { Spinner };
