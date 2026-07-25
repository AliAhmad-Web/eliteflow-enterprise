"use client";

import { motion } from "framer-motion";

import { QuickActionButtons } from "@/features/dashboard/components/quick-action-buttons";
import { slideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { QuickAction } from "@/features/dashboard/types/dashboard.types";

interface WelcomeBannerProps {
  userName: string;
  actions?: QuickAction[];
  className?: string;
}

export function WelcomeBanner({
  userName,
  actions,
  className,
}: WelcomeBannerProps) {
  return (
    <motion.section
      className={cn(
        "relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/8 via-card to-card p-5 shadow-[var(--shadow-sm)] sm:p-6",
        className,
      )}
      {...slideUp}
      aria-label="Welcome"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
            Welcome back, {userName}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">
            <QuickActionButtons actions={actions} variant="compact" />
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}
