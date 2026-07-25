"use client";

import { cn } from "@/lib/utils";

interface ResponsiveDataViewProps {
  /** Desktop / tablet table (or compact list) */
  table: React.ReactNode;
  /** Mobile card stack */
  cards: React.ReactNode;
  className?: string;
  /**
   * Breakpoint at which the table becomes visible.
   * Below this, cards are shown.
   * @default "md"
   */
  tableFrom?: "sm" | "md" | "lg";
}

const TABLE_VISIBLE: Record<NonNullable<ResponsiveDataViewProps["tableFrom"]>, string> =
  {
    sm: "hidden sm:block",
    md: "hidden md:block",
    lg: "hidden lg:block",
  };

const CARDS_VISIBLE: Record<NonNullable<ResponsiveDataViewProps["tableFrom"]>, string> =
  {
    sm: "block sm:hidden",
    md: "block md:hidden",
    lg: "block lg:hidden",
  };

/**
 * Switches between a full/compact table and a mobile card layout without changing data logic.
 */
export function ResponsiveDataView({
  table,
  cards,
  className,
  tableFrom = "md",
}: ResponsiveDataViewProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className={TABLE_VISIBLE[tableFrom]}>{table}</div>
      <div className={CARDS_VISIBLE[tableFrom]}>{cards}</div>
    </div>
  );
}
