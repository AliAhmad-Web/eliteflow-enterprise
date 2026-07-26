import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Calendar,
  CheckSquare,
  Download,
  FileText,
  FolderKanban,
  FolderOpen,
  Hash,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  PenTool,
  Plug,
  Receipt,
  Settings,
  Shield,
  UserCog,
  Users,
  Video,
} from "lucide-react";
import {
  PERMISSIONS,
  UserRole,
  type PermissionKey,
} from "@enterprise/shared";

import { ROUTES } from "@/constants/routes";

export interface NavigationItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  /** Single required permission */
  permission?: PermissionKey | string;
  /** At least one of these permissions */
  anyPermissions?: readonly (PermissionKey | string)[];
  /** Optional role allow-list (in addition to permissions) */
  roles?: readonly UserRole[];
}

export interface NavigationSection {
  label?: string;
  items: NavigationItem[];
}

export const MAIN_NAVIGATION: NavigationSection[] = [
  {
    label: "Home",
    items: [
      {
        title: "Admin Console",
        href: ROUTES.ADMIN,
        icon: Shield,
        permission: PERMISSIONS.ADMIN_ACCESS,
        roles: [UserRole.SUPER_ADMIN],
      },
      {
        title: "Operations",
        href: ROUTES.DASHBOARD,
        icon: LayoutDashboard,
        permission: PERMISSIONS.PROJECTS_READ,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      },
      {
        title: "My Workspace",
        href: ROUTES.WORKSPACE,
        icon: LayoutDashboard,
        permission: PERMISSIONS.TASKS_READ,
        roles: [UserRole.EMPLOYEE],
      },
      {
        title: "Client Portal",
        href: ROUTES.PORTAL,
        icon: LayoutDashboard,
        permission: PERMISSIONS.PROJECTS_READ,
        roles: [UserRole.CLIENT],
      },
    ],
  },
  {
    label: "Business",
    items: [
      {
        title: "Clients",
        href: ROUTES.CLIENTS,
        icon: Users,
        permission: PERMISSIONS.CLIENTS_READ,
        roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EMPLOYEE],
      },
      {
        title: "Projects",
        href: ROUTES.PROJECTS,
        icon: FolderKanban,
        permission: PERMISSIONS.PROJECTS_READ,
      },
      {
        title: "Tasks",
        href: ROUTES.TASKS,
        icon: CheckSquare,
        permission: PERMISSIONS.TASKS_READ,
      },
      {
        title: "Invoice & Billing",
        href: ROUTES.INVOICES,
        icon: Receipt,
        permission: PERMISSIONS.INVOICES_READ,
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        title: "AI Documents",
        href: ROUTES.AI_DOCUMENTS,
        icon: FileText,
        permission: PERMISSIONS.AI_USE,
      },
      {
        title: "AI Assistant",
        href: ROUTES.AI_ASSISTANT,
        icon: Bot,
        permission: PERMISSIONS.AI_USE,
      },
    ],
  },
  {
    label: "Communication",
    items: [
      {
        title: "Messages",
        href: ROUTES.MESSAGES,
        icon: MessageSquare,
        anyPermissions: [
          PERMISSIONS.COMMUNICATION_READ,
          PERMISSIONS.CHAT_READ,
          PERMISSIONS.COMMUNICATION_WRITE,
          PERMISSIONS.CHAT_WRITE,
        ],
      },
      {
        title: "Channels",
        href: ROUTES.CHANNELS,
        icon: Hash,
        anyPermissions: [
          PERMISSIONS.COMMUNICATION_READ,
          PERMISSIONS.CHAT_READ,
        ],
      },
      {
        title: "Announcements",
        href: ROUTES.ANNOUNCEMENTS,
        icon: Megaphone,
        anyPermissions: [
          PERMISSIONS.COMMUNICATION_READ,
          PERMISSIONS.CHAT_READ,
        ],
      },
      {
        title: "Threads",
        href: ROUTES.THREADS,
        icon: MessagesSquare,
        anyPermissions: [
          PERMISSIONS.COMMUNICATION_READ,
          PERMISSIONS.CHAT_READ,
        ],
      },
      {
        title: "Meetings",
        href: ROUTES.MEETINGS,
        icon: Video,
        anyPermissions: [
          PERMISSIONS.COMMUNICATION_READ,
          PERMISSIONS.CHAT_READ,
        ],
      },
      {
        title: "Activity",
        href: ROUTES.ACTIVITY,
        icon: Activity,
        anyPermissions: [
          PERMISSIONS.COMMUNICATION_READ,
          PERMISSIONS.CHAT_READ,
          PERMISSIONS.COMMUNICATION_WRITE,
          PERMISSIONS.CHAT_WRITE,
        ],
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        title: "Calendar",
        href: ROUTES.CALENDAR,
        icon: Calendar,
        permission: PERMISSIONS.CALENDAR_READ,
      },
      {
        title: "Whiteboard",
        href: ROUTES.WHITEBOARD,
        icon: PenTool,
        permission: PERMISSIONS.WHITEBOARDS_READ,
      },
      {
        title: "File Manager",
        href: ROUTES.FILE_MANAGER,
        icon: FolderOpen,
        permission: PERMISSIONS.FILES_READ,
      },
      {
        title: "Reports",
        href: ROUTES.REPORTS,
        icon: BarChart3,
        permission: PERMISSIONS.REPORTS_READ,
      },
      {
        title: "Team",
        href: ROUTES.TEAM,
        icon: UserCog,
        permission: PERMISSIONS.TEAM_READ,
      },
      {
        title: "Notifications",
        href: ROUTES.NOTIFICATIONS,
        icon: Bell,
        permission: PERMISSIONS.NOTIFICATIONS_READ,
      },
      {
        title: "Integrations",
        href: ROUTES.INTEGRATIONS,
        icon: Plug,
        roles: [
          UserRole.SUPER_ADMIN,
          UserRole.ADMIN,
          UserRole.EMPLOYEE,
          UserRole.CLIENT,
        ],
      },
      {
        title: "Security",
        href: ROUTES.SECURITY,
        icon: Shield,
      },
      {
        title: "Settings",
        href: ROUTES.SETTINGS,
        icon: Settings,
      },
    ],
  },
  {
    label: "Apps",
    items: [
      {
        title: "Downloads",
        href: ROUTES.DOWNLOADS,
        icon: Download,
      },
    ],
  },
];
