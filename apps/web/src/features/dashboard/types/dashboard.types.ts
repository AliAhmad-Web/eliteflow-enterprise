import type { LucideIcon } from "lucide-react";

export type TrendDirection = "up" | "down" | "neutral";

export type TaskPriority = "high" | "medium" | "low";

export type ProjectStatus =
  | "in_progress"
  | "completed"
  | "on_hold"
  | "not_started";

export type InvoiceStatus = "paid" | "pending" | "overdue";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface KpiStat {
  id: string;
  label: string;
  value: string;
  change: number;
  trend: TrendDirection;
  icon: LucideIcon;
  iconClassName?: string;
}

export interface RevenueDataPoint {
  label: string;
  value: number;
}

export interface ProjectStatusSegment {
  id: string;
  label: string;
  value: number;
  colorClass: string;
}

export interface DashboardTask {
  id: string;
  title: string;
  priority: TaskPriority;
  time: string;
  completed: boolean;
}

export interface RecentProject {
  id: string;
  name: string;
  company: string;
  status: ProjectStatus;
  date: string;
  team: string[];
}

export interface RecentInvoice {
  id: string;
  client: string;
  amount: number;
  status: InvoiceStatus;
}

export interface DashboardNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: NotificationType;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  /** Navigate here when the action is activated */
  href?: string;
}

export interface CalendarDay {
  date: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvent: boolean;
}

export interface UserProfile {
  name: string;
  role: string;
  initials: string;
  email: string;
}
