import {
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  Mail,
  MessageSquare,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import { PERMISSIONS } from "@enterprise/shared";

import { ROUTES } from "@/constants/routes";
import type { QuickAction } from "@/features/dashboard/types/dashboard.types";

/** Module shortcuts shown in the utility panel Quick Access section. */
export const QUICK_ACCESS_ACTIONS: QuickAction[] = [
  {
    id: "tasks",
    label: "Tasks",
    icon: CheckSquare,
    permission: PERMISSIONS.TASKS_READ,
    href: ROUTES.TASKS,
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderKanban,
    permission: PERMISSIONS.PROJECTS_READ,
    href: ROUTES.PROJECTS,
  },
  {
    id: "clients",
    label: "Clients",
    icon: Users,
    permission: PERMISSIONS.CLIENTS_READ,
    href: ROUTES.CLIENTS,
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: CalendarDays,
    permission: PERMISSIONS.CALENDAR_READ,
    href: ROUTES.CALENDAR,
  },
  {
    id: "messages",
    label: "Messages",
    icon: MessageSquare,
    permission: PERMISSIONS.CHAT_READ,
    href: ROUTES.MESSAGES,
  },
  {
    id: "invoices",
    label: "Invoices",
    icon: Receipt,
    permission: PERMISSIONS.INVOICES_READ,
    href: ROUTES.INVOICES,
  },
  {
    id: "files",
    label: "Files",
    icon: FileText,
    permission: PERMISSIONS.FILES_READ,
    href: ROUTES.FILE_MANAGER,
  },
  {
    id: "ai",
    label: "AI Assistant",
    icon: Sparkles,
    permission: PERMISSIONS.AI_USE,
    href: ROUTES.AI_ASSISTANT,
  },
];

/** AI-oriented shortcuts inside the AI Assistant card. */
export const AI_QUICK_ACTIONS: QuickAction[] = [
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
    permission: PERMISSIONS.AI_USE,
    href: `${ROUTES.AI_ASSISTANT}?mode=EMAIL`,
  },
  {
    id: "analyze",
    label: "Analyze Data",
    icon: Sparkles,
    permission: PERMISSIONS.AI_USE,
    href: `${ROUTES.AI_ASSISTANT}?mode=ANALYZE`,
  },
  {
    id: "document",
    label: "Summarize Document",
    icon: FileText,
    permission: PERMISSIONS.AI_USE,
    href: ROUTES.AI_DOCUMENTS,
  },
];
