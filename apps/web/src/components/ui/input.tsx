import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-input/90 bg-card px-3 text-sm leading-none text-foreground shadow-(--shadow-xs)",
          "transition-[border-color,box-shadow,background-color] duration-150 ease-(--ease-enterprise)",
          "placeholder:text-muted-foreground/70",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "hover:border-border",
          "focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error &&
            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/35",
          className,
        )}
        ref={ref}
        disabled={disabled}
        aria-invalid={error}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
