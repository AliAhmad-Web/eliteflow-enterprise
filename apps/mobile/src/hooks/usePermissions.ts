import { PERMISSIONS, hasPermission } from "@enterprise/shared";

import { useAuthStore } from "@/auth/auth.store";

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const subject = user
    ? { role: user.role.code, permissions: user.permissions }
    : null;

  const can = (permission: string) =>
    subject ? hasPermission(subject, permission) : false;

  return {
    subject,
    can,
    roleCode: user?.role.code ?? null,
    isClient: user?.role.code === "CLIENT",
    canReadClients: can(PERMISSIONS.CLIENTS_READ),
    canWriteClients: can(PERMISSIONS.CLIENTS_WRITE),
    canDeleteClients: can(PERMISSIONS.CLIENTS_DELETE),
    canReadProjects: can(PERMISSIONS.PROJECTS_READ),
    canWriteProjects: can(PERMISSIONS.PROJECTS_WRITE),
    canDeleteProjects: can(PERMISSIONS.PROJECTS_DELETE),
    canReadTasks: can(PERMISSIONS.TASKS_READ),
    canWriteTasks: can(PERMISSIONS.TASKS_WRITE),
    canDeleteTasks: can(PERMISSIONS.TASKS_DELETE),
    canReadCalendar: can(PERMISSIONS.CALENDAR_READ),
    canWriteCalendar: can(PERMISSIONS.CALENDAR_WRITE),
    canUseAi: can(PERMISSIONS.AI_USE),
    canReadChat: can(PERMISSIONS.CHAT_READ),
    canWriteChat: can(PERMISSIONS.CHAT_WRITE),
    canReadCommunication: can(PERMISSIONS.COMMUNICATION_READ),
    canReadFiles: can(PERMISSIONS.FILES_READ),
    canUploadFiles: can(PERMISSIONS.FILES_UPLOAD),
    canDeleteFiles: can(PERMISSIONS.FILES_DELETE),
    canReadInvoices: can(PERMISSIONS.INVOICES_READ),
    canWriteInvoices: can(PERMISSIONS.INVOICES_WRITE),
    canReadWhiteboards: can(PERMISSIONS.WHITEBOARDS_READ),
    canWriteWhiteboards: can(PERMISSIONS.WHITEBOARDS_WRITE),
    canManageSettings: can(PERMISSIONS.SETTINGS_MANAGE),
  };
}
