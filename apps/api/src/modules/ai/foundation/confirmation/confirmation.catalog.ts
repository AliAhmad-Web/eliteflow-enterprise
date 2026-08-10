/**
 * Protected AI / business actions that require human confirmation.
 */

import {
  CONFIRMATION_RISK_LEVELS,
  type ProtectedActionDefinition,
} from "./confirmation.types.js";

export const PROTECTED_ACTION_CATALOG: readonly ProtectedActionDefinition[] = [
  {
    actionKey: "create_employee",
    action: "Create Employee",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["hire_employee"],
    summaryTemplate: "Hire / create an employee record",
  },
  {
    actionKey: "delete_employee",
    action: "Delete Employee",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["delete_employee"],
    summaryTemplate: "Permanently delete an employee",
  },
  {
    actionKey: "terminate_employee",
    action: "Terminate Employee",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["terminate_employee"],
    summaryTemplate: "Terminate an employee",
  },
  {
    actionKey: "promote_employee",
    action: "Promote Employee",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["promote_employee"],
    summaryTemplate: "Promote an employee",
  },
  {
    actionKey: "salary_change",
    action: "Salary Change",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["salary_change"],
    summaryTemplate: "Change employee salary",
  },
  {
    actionKey: "role_change",
    action: "Role Change",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["role_change"],
    summaryTemplate: "Change user / employee role",
  },
  {
    actionKey: "permission_change",
    action: "Permission Change",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["permission_change"],
    summaryTemplate: "Change permissions",
  },
  {
    actionKey: "create_admin",
    action: "Create Admin",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["create_admin"],
    summaryTemplate: "Create an administrator account",
  },
  {
    actionKey: "delete_admin",
    action: "Delete Admin",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["delete_admin"],
    summaryTemplate: "Delete an administrator account",
  },
  {
    actionKey: "reset_credentials",
    action: "Reset Credentials",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["reset_credentials"],
    summaryTemplate: "Reset user credentials",
  },
  {
    actionKey: "reset_mfa",
    action: "Reset MFA",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["reset_mfa"],
    summaryTemplate: "Reset multi-factor authentication",
  },
  {
    actionKey: "department_change",
    action: "Department Change",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["department_change"],
    summaryTemplate: "Change employee department",
  },
  {
    actionKey: "transfer_employee",
    action: "Transfer Employee",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["transfer_employee"],
    summaryTemplate: "Transfer an employee",
  },
  {
    actionKey: "leave_approval",
    action: "Leave Approval",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["leave_approval"],
    summaryTemplate: "Approve or reject leave",
  },
  {
    actionKey: "payroll_action",
    action: "Payroll Actions",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["payroll_action"],
    summaryTemplate: "Execute a payroll action",
  },
  {
    actionKey: "invoice_delete",
    action: "Invoice Delete",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["invoice_delete"],
    summaryTemplate: "Delete an invoice",
  },
  {
    actionKey: "invoice_approval",
    action: "Invoice Approval",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["invoice_approval"],
    summaryTemplate: "Approve an invoice",
  },
  {
    actionKey: "project_delete",
    action: "Project Delete",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["project_delete"],
    summaryTemplate: "Delete a project",
  },
  {
    actionKey: "task_delete",
    action: "Task Delete",
    riskLevel: CONFIRMATION_RISK_LEVELS.MEDIUM,
    toolIds: ["task_delete"],
    summaryTemplate: "Delete a task",
  },
  {
    actionKey: "company_settings",
    action: "Company Settings",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["company_settings"],
    summaryTemplate: "Change company settings",
  },
  {
    actionKey: "integration_changes",
    action: "Integration Changes",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["integration_changes"],
    summaryTemplate: "Change integrations",
  },
  {
    actionKey: "api_key_generation",
    action: "API Key Generation",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["api_key_generation"],
    summaryTemplate: "Generate an API key",
  },
  {
    actionKey: "secret_rotation",
    action: "Secret Rotation",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["secret_rotation"],
    summaryTemplate: "Rotate secrets",
  },
  {
    actionKey: "file_permanent_delete",
    action: "File Permanent Delete",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["file_permanent_delete"],
    summaryTemplate: "Permanently delete a file",
  },
  {
    actionKey: "bulk_delete",
    action: "Bulk Delete",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["bulk_delete"],
    summaryTemplate: "Bulk delete records",
  },
  {
    actionKey: "bulk_export",
    action: "Bulk Export",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["bulk_export"],
    summaryTemplate: "Bulk export data",
  },
  {
    actionKey: "ai_memory_delete",
    action: "AI Memory Delete",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["ai_memory_delete"],
    summaryTemplate: "Delete AI memory",
  },
  {
    actionKey: "ai_memory_reset",
    action: "AI Memory Reset",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["ai_memory_reset"],
    summaryTemplate: "Reset AI memory",
  },
  {
    actionKey: "database_restore",
    action: "Database Restore",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["database_restore"],
    summaryTemplate: "Restore database",
  },
  {
    actionKey: "disaster_recovery_mode",
    action: "Disaster Recovery Mode",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["disaster_recovery_mode"],
    summaryTemplate: "Enable disaster recovery mode",
  },
  {
    actionKey: "recovery_override",
    action: "Recovery Override",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["recovery_override"],
    summaryTemplate: "Override recovery controls",
  },
  {
    actionKey: "compliance_override",
    action: "Compliance Override",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["compliance_override"],
    summaryTemplate: "Override compliance controls",
  },
  {
    actionKey: "security_override",
    action: "Security Override",
    riskLevel: CONFIRMATION_RISK_LEVELS.CRITICAL,
    toolIds: ["security_override"],
    summaryTemplate: "Override security controls",
  },
  {
    actionKey: "create_task",
    action: "Create Task",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["create_task"],
    summaryTemplate: "Create a task via AI tool",
  },
  {
    actionKey: "create_calendar_event",
    action: "Create Calendar Event",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["create_calendar_event"],
    summaryTemplate: "Create a calendar event via AI tool",
  },
  {
    actionKey: "save_ai_document",
    action: "Save AI Document",
    riskLevel: CONFIRMATION_RISK_LEVELS.HIGH,
    toolIds: ["save_ai_document"],
    summaryTemplate: "Persist an AI-generated document",
  },
] as const;

const BY_TOOL_ID = new Map<string, ProtectedActionDefinition>();
const BY_ACTION_KEY = new Map<string, ProtectedActionDefinition>();

for (const def of PROTECTED_ACTION_CATALOG) {
  BY_ACTION_KEY.set(def.actionKey, def);
  for (const toolId of def.toolIds) {
    BY_TOOL_ID.set(toolId, def);
  }
}

export function getProtectedActionByToolId(
  toolId: string,
): ProtectedActionDefinition | null {
  return BY_TOOL_ID.get(toolId) ?? null;
}

export function getProtectedActionByKey(
  actionKey: string,
): ProtectedActionDefinition | null {
  return BY_ACTION_KEY.get(actionKey) ?? null;
}
