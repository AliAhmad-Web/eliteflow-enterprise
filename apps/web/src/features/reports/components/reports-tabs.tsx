"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { REPORTS_TAB_LABELS, type ReportsTab } from "../types/reports.types";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export interface ReportsTabsProps {
  activeTab: ReportsTab;
  onTabChange: (tab: ReportsTab) => void;
}

export function ReportsTabs({ activeTab, onTabChange }: ReportsTabsProps) {
  const tabs = Object.keys(REPORTS_TAB_LABELS) as ReportsTab[];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <TabButton
          key={tab}
          active={activeTab === tab}
          onClick={() => onTabChange(tab)}
        >
          {REPORTS_TAB_LABELS[tab]}
        </TabButton>
      ))}
    </div>
  );
}
