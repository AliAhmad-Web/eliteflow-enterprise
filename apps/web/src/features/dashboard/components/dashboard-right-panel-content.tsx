"use client";

import { motion } from "framer-motion";

import { AiAssistantWidget } from "@/features/dashboard/components/ai-assistant-widget";
import { CalendarWidget } from "@/features/dashboard/components/calendar-widget";
import { QuickAccessWidget } from "@/features/dashboard/components/quick-access-widget";
import { TodaysTasksWidget } from "@/features/dashboard/components/todays-tasks-widget";
import { staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface DashboardRightPanelContentProps {
  className?: string;
}

export function DashboardRightPanelContent({
  className,
}: DashboardRightPanelContentProps) {
  return (
    <motion.div
      className={cn("space-y-4", className)}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <QuickAccessWidget />
      <TodaysTasksWidget />
      <CalendarWidget />
      <AiAssistantWidget />
    </motion.div>
  );
}
