import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-lg text-sm font-medium tracking-tight leading-none",
    "transition-[background-color,border-color,color,box-shadow,opacity] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:max-w-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-xs)] hover:bg-primary/90 active:bg-primary/85",
        secondary:
          "border border-border/70 bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground hover:border-border",
        ghost:
          "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--shadow-xs)] hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
        outline:
          "border border-border/80 bg-card text-foreground shadow-[var(--shadow-xs)] hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-3.5 [&_svg]:size-4",
        sm: "h-8 rounded-lg px-3 text-xs [&_svg]:size-3.5",
        lg: "h-10 rounded-lg px-5 text-[0.9375rem] [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
        "icon-sm": "size-8 [&_svg]:size-3.5",
        "icon-lg": "size-10 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    if (asChild) {
      return (
        <Slot className={classes} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
