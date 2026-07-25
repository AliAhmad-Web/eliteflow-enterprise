"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface DeepLinkHighlightProps {
  active: boolean;
  children: React.ReactNode;
  className?: string;
  /** Element id for scrollIntoView targeting */
  scrollId?: string;
}

/**
 * Wraps a list row to briefly highlight + scroll into view when opened via notification.
 */
export function DeepLinkHighlight({
  active,
  children,
  className,
  scrollId,
}: DeepLinkHighlightProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active]);

  return (
    <div
      ref={ref}
      id={scrollId}
      className={cn(
        "rounded-lg transition-[box-shadow,background-color] duration-500",
        active &&
          "animate-in fade-in-0 zoom-in-95 bg-primary/10 ring-2 ring-primary/40 shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
