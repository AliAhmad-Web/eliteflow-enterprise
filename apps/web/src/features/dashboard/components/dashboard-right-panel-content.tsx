"use client";

import { motion } from "framer-motion";

import { AiAssistantWidget } from "@/features/dashboard/components/ai-assistant-widget";
import { CalendarWidget } from "@/features/dashboard/components/calendar-widget";
import { TodaysTasksWidget } from "@/features/dashboard/components/todays-tasks-widget";
import {
  CALENDAR_MONTH_LABEL,
  DUMMY_CALENDAR_DAYS,
  DUMMY_QUICK_ACTIONS,
  DUMMY_TASKS,
} from "@/features/dashboard/data/dashboard.dummy";
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
      <TodaysTasksWidget tasks={DUMMY_TASKS} />
      <CalendarWidget
        monthLabel={CALENDAR_MONTH_LABEL}
        days={DUMMY_CALENDAR_DAYS}
      />
      <AiAssistantWidget actions={DUMMY_QUICK_ACTIONS} />
    </motion.div>
  );
}
