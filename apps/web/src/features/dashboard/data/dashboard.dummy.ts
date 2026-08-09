import {
  DollarSign,
  FolderKanban,
  Receipt,
  Users,
} from "lucide-react";

import type {
  DashboardNotification,
  KpiStat,
  ProjectStatusSegment,
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
