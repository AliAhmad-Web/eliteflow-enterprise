import {
  DollarSign,
  FileText,
  FolderKanban,
  Mail,
  Plus,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import { PERMISSIONS } from "@enterprise/shared";

import { ROUTES } from "@/constants/routes";
import type {
  CalendarDay,
  DashboardNotification,
  DashboardTask,
  KpiStat,
  ProjectStatusSegment,
  QuickAction,
  RecentInvoice,
  RecentProject,
  RevenueDataPoint,
  UserProfile,
} from "@/features/dashboard/types/dashboard.types";

export const DUMMY_USER: UserProfile = {
  name: "Ali Ahmad",
  role: "Administrator",
  initials: "AA",
  email: "ali.ahmad@eliteflow.com",
};

export const DUMMY_KPI_STATS: KpiStat[] = [
  {
    id: "revenue",
    label: "Total Revenue",
    value: "$24,590.00",
    change: 12.5,
    trend: "up",
    icon: DollarSign,
    iconClassName: "text-primary bg-primary/10",
  },
  {
    id: "clients",
    label: "Total Clients",
    value: "128",
    change: 8.2,
    trend: "up",
    icon: Users,
    iconClassName: "text-info bg-info/10",
  },
  {
    id: "projects",
    label: "Active Projects",
    value: "24",
    change: 15.3,
    trend: "up",
    icon: FolderKanban,
    iconClassName: "text-success bg-success/10",
  },
  {
    id: "invoices",
    label: "Pending Invoices",
    value: "12",
    change: -3.1,
    trend: "down",
    icon: Receipt,
    iconClassName: "text-warning bg-warning/10",
  },
];

export const DUMMY_REVENUE_DATA: RevenueDataPoint[] = [
  { label: "Jan", value: 12400 },
  { label: "Feb", value: 14200 },
  { label: "Mar", value: 13800 },
  { label: "Apr", value: 15600 },
  { label: "May", value: 18750 },
  { label: "Jun", value: 17200 },
  { label: "Jul", value: 19800 },
];

export const DUMMY_PROJECT_STATUS: ProjectStatusSegment[] = [
  { id: "completed", label: "Completed", value: 8, colorClass: "text-chart-3" },
  { id: "in_progress", label: "In Progress", value: 10, colorClass: "text-chart-1" },
  { id: "on_hold", label: "On Hold", value: 4, colorClass: "text-chart-4" },
  { id: "not_started", label: "Not Started", value: 2, colorClass: "text-chart-6" },
];

export const DUMMY_TASKS: DashboardTask[] = [
  {
    id: "1",
    title: "Review Q2 financial report",
    priority: "high",
    time: "9:00 AM",
    completed: false,
  },
  {
    id: "2",
    title: "Client call with Acme Corp",
    priority: "high",
    time: "11:30 AM",
    completed: false,
  },
  {
    id: "3",
    title: "Update project milestones",
    priority: "medium",
    time: "2:00 PM",
    completed: true,
  },
  {
    id: "4",
    title: "Send invoice reminders",
    priority: "medium",
    time: "4:30 PM",
    completed: false,
  },
];

export const DUMMY_RECENT_PROJECTS: RecentProject[] = [
  {
    id: "1",
    name: "Website Redesign",
    company: "Acme Corporation",
    status: "in_progress",
    date: "May 18, 2026",
    team: ["JD", "SK", "MR"],
  },
  {
    id: "2",
    name: "Mobile App Development",
    company: "TechStart Inc",
    status: "in_progress",
    date: "May 15, 2026",
    team: ["AL", "PK"],
  },
  {
    id: "3",
    name: "Brand Identity",
    company: "Nova Labs",
    status: "completed",
    date: "May 12, 2026",
    team: ["EM", "TR", "LW"],
  },
  {
    id: "4",
    name: "E-commerce Platform",
    company: "Retail Plus",
    status: "on_hold",
    date: "May 10, 2026",
    team: ["JD", "NK"],
  },
];

export const DUMMY_RECENT_INVOICES: RecentInvoice[] = [
  { id: "INV-1042", client: "Acme Corporation", amount: 4500, status: "paid" },
  { id: "INV-1041", client: "TechStart Inc", amount: 2800, status: "pending" },
  { id: "INV-1040", client: "Nova Labs", amount: 6200, status: "paid" },
  { id: "INV-1039", client: "Retail Plus", amount: 1950, status: "overdue" },
];

export const DUMMY_NOTIFICATIONS: DashboardNotification[] = [
  {
    id: "1",
    title: "Invoice paid",
    description: "Acme Corporation paid INV-1042",
    time: "5 min ago",
    read: false,
    type: "success",
  },
  {
    id: "2",
    title: "New client added",
    description: "GlobalTech joined your workspace",
    time: "1 hour ago",
    read: false,
    type: "info",
  },
  {
    id: "3",
    title: "Project deadline",
    description: "Website Redesign due in 2 days",
    time: "3 hours ago",
    read: false,
    type: "warning",
  },
  {
    id: "4",
    title: "Team update",
    description: "Sarah joined the Mobile App project",
    time: "Yesterday",
    read: true,
    type: "info",
  },
];

export const DUMMY_QUICK_ACTIONS: QuickAction[] = [
  {
    id: "invoice",
    label: "Generate Invoice",
    icon: Receipt,
    permission: PERMISSIONS.INVOICES_WRITE,
    href: ROUTES.INVOICES,
  },
  {
    id: "email",
    label: "Write Email",
    icon: Mail,
    permission: PERMISSIONS.CHAT_WRITE,
    href: ROUTES.AI_ASSISTANT,
  },
  {
    id: "analyze",
    label: "Analyze Data",
    icon: Sparkles,
    permission: PERMISSIONS.AI_USE,
    href: ROUTES.AI_ASSISTANT,
  },
  {
    id: "document",
    label: "Summarize Document",
    icon: FileText,
    permission: PERMISSIONS.AI_USE,
    href: ROUTES.AI_DOCUMENTS,
  },
];

export const DUMMY_CREATE_ACTIONS: QuickAction[] = [
  {
    id: "project",
    label: "New Project",
    icon: FolderKanban,
    permission: PERMISSIONS.PROJECTS_WRITE,
    href: ROUTES.PROJECTS,
  },
  {
    id: "client",
    label: "New Client",
    icon: Users,
    permission: PERMISSIONS.CLIENTS_WRITE,
    href: ROUTES.CLIENTS,
  },
  {
    id: "invoice",
    label: "New Invoice",
    icon: Receipt,
    permission: PERMISSIONS.INVOICES_WRITE,
    href: ROUTES.INVOICES,
  },
  {
    id: "task",
    label: "New Task",
    icon: Plus,
    permission: PERMISSIONS.TASKS_WRITE,
    href: ROUTES.TASKS,
  },
];

/** Mini calendar for May 2026 — today = 19 */
export const DUMMY_CALENDAR_DAYS: CalendarDay[] = (() => {
  const days: CalendarDay[] = [];
  const startOffset = 4; // May 1 2026 is Friday (0=Sun)

  for (let i = 0; i < startOffset; i++) {
    days.push({ date: 26 + i, isCurrentMonth: false, isToday: false, hasEvent: false });
  }
  for (let d = 1; d <= 31; d++) {
    days.push({
      date: d,
      isCurrentMonth: true,
      isToday: d === 19,
      hasEvent: [5, 12, 19, 26].includes(d),
    });
  }
  return days;
})();

export const CALENDAR_MONTH_LABEL = "May 2026";
