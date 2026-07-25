"use client";

import { motion } from "framer-motion";

import { QuickActionButtons } from "@/features/dashboard/components/quick-action-buttons";
import { slideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { QuickAction } from "@/features/dashboard/types/dashboard.types";

interface RoleDashboardHeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
  actions?: QuickAction[];
  className?: string;
}

export function RoleDashboardHeader({
  title,
  subtitle,
  badge,
  actions,
  className,
}: RoleDashboardHeaderProps) {
  return (
    <motion.section
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
      {...slideUp}
      aria-label={title}
    >
      <div className="space-y-2">
        {badge ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {badge}
          </p>
        ) : null}
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-[28px]">
          {title}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
        {actions ? (
          <QuickActionButtons actions={actions} variant="compact" />
        ) : null}
      </div>
    </motion.section>
  );
}
