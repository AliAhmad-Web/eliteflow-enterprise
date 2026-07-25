import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-5 items-center justify-center rounded-md border px-1.5 text-[10px] font-semibold leading-none tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/12 bg-primary/8 text-primary",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        success: "border-success/15 bg-success/10 text-success",
        warning: "border-warning/15 bg-warning/10 text-warning",
        destructive: "border-destructive/15 bg-destructive/10 text-destructive",
        info: "border-info/15 bg-info/10 text-info",
        outline: "border-border/80 bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
