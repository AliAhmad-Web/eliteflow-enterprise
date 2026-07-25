import {
  AlertTriangle,
  CheckSquare,
  Clock,
  DollarSign,
  FileText,
  FolderKanban,
  Plus,
  Receipt,
  Shield,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { PERMISSIONS } from "@enterprise/shared";

import { ROUTES } from "@/constants/routes";
import type {
  DashboardNotification,
  DashboardTask,
  KpiStat,
  ProjectStatusSegment,
  QuickAction,
  RecentInvoice,
  RecentProject,
  RevenueDataPoint,
} from "@/features/dashboard/types/dashboard.types";

export interface DashboardFocusItem {
  id: string;
  title: string;
  meta: string;
  tone?: "default" | "warning" | "success" | "danger";
}

/** Super Admin — platform / security console */
export const SUPER_ADMIN_KPI_STATS: KpiStat[] = [
  {
    id: "tenants",
    label: "Active Tenants",
    value: "18",
    change: 6.2,
    trend: "up",
    icon: Users,
    iconClassName: "text-primary bg-primary/10",
  },
  {
    id: "users",
    label: "Platform Users",
    value: "1,284",
    change: 4.1,
    trend: "up",
    icon: UserPlus,
    iconClassName: "text-info bg-info/10",
  },
  {
    id: "sessions",
    label: "Active Sessions",
    value: "312",
    change: -2.4,
    trend: "down",
    icon: Shield,
    iconClassName: "text-success bg-success/10",
  },
  {
    id: "alerts",
    label: "Security Alerts",
    value: "3",
    change: 1.0,
    trend: "up",
    icon: ShieldAlert,
    iconClassName: "text-warning bg-warning/10",
  },
];

export const SUPER_ADMIN_FOCUS: DashboardFocusItem[] = [
  {
    id: "1",
    title: "Review failed login spike",
    meta: "42 attempts · last 24h · IP cluster AP-NE",
    tone: "danger",
  },
  {
    id: "2",
    title: "Rotate expired API secrets",
    meta: "2 integrations pending · due today",
    tone: "warning",
  },
  {
    id: "3",
    title: "Approve tenant upgrade request",
    meta: "Nova Labs · Enterprise plan",
    tone: "default",
  },
  {
    id: "4",
    title: "Audit log retention check",
    meta: "Policy: 90 days · healthy",
    tone: "success",
  },
];

export const SUPER_ADMIN_ACTIONS: QuickAction[] = [
  {
    id: "invite-admin",
    label: "Invite Admin",
    icon: UserPlus,
    permission: PERMISSIONS.USERS_MANAGE,
    href: ROUTES.TEAM,
  },
  {
    id: "security",
    label: "Security Center",
    icon: Shield,
    permission: PERMISSIONS.ADMIN_ACCESS,
    href: ROUTES.SETTINGS_SECURITY,
  },
  {
    id: "audit",
    label: "Audit Logs",
    icon: FileText,
    permission: PERMISSIONS.AUDIT_READ,
    href: ROUTES.REPORTS,
  },
];

/** Admin — business operations */
export const ADMIN_KPI_STATS: KpiStat[] = [
  {
    id: "revenue",
    label: "Monthly Revenue",
    value: "$48,920",
    change: 12.5,
    trend: "up",
    icon: DollarSign,
    iconClassName: "text-primary bg-primary/10",
  },
  {
    id: "clients",
    label: "Active Clients",
    value: "128",
    change: 8.2,
    trend: "up",
    icon: Users,
    iconClassName: "text-info bg-info/10",
  },
  {
    id: "projects",
    label: "Open Projects",
    value: "24",
    change: 15.3,
    trend: "up",
    icon: FolderKanban,
    iconClassName: "text-success bg-success/10",
  },
  {
    id: "invoices",
    label: "Outstanding Invoices",
    value: "12",
    change: -3.1,
    trend: "down",
    icon: Receipt,
    iconClassName: "text-warning bg-warning/10",
  },
];

export const ADMIN_ACTIONS: QuickAction[] = [
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
    id: "team",
    label: "Add Teammate",
    icon: UserPlus,
    permission: PERMISSIONS.TEAM_MANAGE,
    href: ROUTES.TEAM,
  },
];

export const ADMIN_REVENUE_DATA: RevenueDataPoint[] = [
  { label: "Jan", value: 12400 },
  { label: "Feb", value: 14200 },
  { label: "Mar", value: 13800 },
  { label: "Apr", value: 15600 },
  { label: "May", value: 18750 },
  { label: "Jun", value: 17200 },
  { label: "Jul", value: 19800 },
];

export const ADMIN_PROJECT_STATUS: ProjectStatusSegment[] = [
  { id: "completed", label: "Completed", value: 8, colorClass: "text-chart-3" },
  { id: "in_progress", label: "In Progress", value: 10, colorClass: "text-chart-1" },
  { id: "on_hold", label: "On Hold", value: 4, colorClass: "text-chart-4" },
  { id: "not_started", label: "Not Started", value: 2, colorClass: "text-chart-6" },
];

export const ADMIN_RECENT_PROJECTS: RecentProject[] = [
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

export const ADMIN_RECENT_INVOICES: RecentInvoice[] = [
  { id: "INV-1042", client: "Acme Corporation", amount: 4500, status: "paid" },
  { id: "INV-1041", client: "TechStart Inc", amount: 2800, status: "pending" },
  { id: "INV-1040", client: "Nova Labs", amount: 6200, status: "paid" },
  { id: "INV-1039", client: "Retail Plus", amount: 1950, status: "overdue" },
];

/** Employee — personal delivery workspace */
export const EMPLOYEE_KPI_STATS: KpiStat[] = [
  {
    id: "my-tasks",
    label: "My Open Tasks",
    value: "9",
    change: -12.0,
    trend: "down",
    icon: CheckSquare,
    iconClassName: "text-primary bg-primary/10",
  },
  {
    id: "due-today",
    label: "Due Today",
    value: "3",
    change: 0,
    trend: "neutral",
    icon: Clock,
    iconClassName: "text-warning bg-warning/10",
  },
  {
    id: "projects",
    label: "Assigned Projects",
    value: "5",
    change: 2.0,
    trend: "up",
    icon: FolderKanban,
    iconClassName: "text-success bg-success/10",
  },
  {
    id: "blocked",
    label: "Blocked Items",
    value: "1",
    change: -50.0,
    trend: "down",
    icon: AlertTriangle,
    iconClassName: "text-destructive bg-destructive/10",
  },
];

export const EMPLOYEE_TASKS: DashboardTask[] = [
  {
    id: "1",
    title: "Finish homepage wireframes",
    priority: "high",
    time: "10:00 AM",
    completed: false,
  },
  {
    id: "2",
    title: "Stand-up notes for Acme",
    priority: "medium",
    time: "11:00 AM",
    completed: false,
  },
  {
    id: "3",
    title: "Upload asset pack to File Manager",
    priority: "medium",
    time: "1:30 PM",
    completed: true,
  },
  {
    id: "4",
    title: "QA mobile nav on staging",
    priority: "high",
    time: "4:00 PM",
    completed: false,
  },
];

export const EMPLOYEE_ACTIONS: QuickAction[] = [
  {
    id: "task",
    label: "New Task",
    icon: Plus,
    permission: PERMISSIONS.TASKS_WRITE,
    href: ROUTES.TASKS,
  },
  {
    id: "project",
    label: "Open Projects",
    icon: FolderKanban,
    permission: PERMISSIONS.PROJECTS_READ,
    href: ROUTES.PROJECTS,
  },
];

export const EMPLOYEE_PROJECTS: RecentProject[] = [
  {
    id: "1",
    name: "Website Redesign",
    company: "Acme Corporation",
    status: "in_progress",
    date: "Due May 22",
    team: ["You", "SK"],
  },
  {
    id: "2",
    name: "Mobile App Development",
    company: "TechStart Inc",
    status: "in_progress",
    date: "Due May 28",
    team: ["You", "AL"],
  },
  {
    id: "3",
    name: "Brand Identity",
    company: "Nova Labs",
    status: "completed",
    date: "Done May 12",
    team: ["You", "EM"],
  },
];

/** Client — portal home */
export const CLIENT_KPI_STATS: KpiStat[] = [
  {
    id: "projects",
    label: "My Projects",
    value: "4",
    change: 0,
    trend: "neutral",
    icon: FolderKanban,
    iconClassName: "text-primary bg-primary/10",
  },
  {
    id: "invoices",
    label: "Open Invoices",
    value: "2",
    change: -1.0,
    trend: "down",
    icon: Receipt,
    iconClassName: "text-warning bg-warning/10",
  },
  {
    id: "files",
    label: "Shared Files",
    value: "36",
    change: 5.0,
    trend: "up",
    icon: FileText,
    iconClassName: "text-info bg-info/10",
  },
  {
    id: "updates",
    label: "New Updates",
    value: "5",
    change: 2.0,
    trend: "up",
    icon: Clock,
    iconClassName: "text-success bg-success/10",
  },
];

export const CLIENT_PROJECTS: RecentProject[] = [
  {
    id: "1",
    name: "Website Redesign",
    company: "Your account",
    status: "in_progress",
    date: "Updated today",
    team: ["JD", "SK"],
  },
  {
    id: "2",
    name: "Brand Refresh",
    company: "Your account",
    status: "on_hold",
    date: "Awaiting feedback",
    team: ["EM"],
  },
];

export const CLIENT_INVOICES: RecentInvoice[] = [
  { id: "INV-2201", client: "Balance due", amount: 3200, status: "pending" },
  { id: "INV-2198", client: "Paid", amount: 1800, status: "paid" },
];

export const CLIENT_UPDATES: DashboardNotification[] = [
  {
    id: "1",
    title: "Milestone shared",
    description: "Homepage designs are ready for review",
    time: "2 hours ago",
    read: false,
    type: "info",
  },
  {
    id: "2",
    title: "Invoice issued",
    description: "INV-2201 is ready for payment",
    time: "Yesterday",
    read: false,
    type: "warning",
  },
];
