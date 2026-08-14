export interface PermissionSeedDefinition {
  key: string;
  resource: string;
  action: string;
  description: string;
}

export const PERMISSIONS: PermissionSeedDefinition[] = [
  // System & Administration
  {
    key: "system:manage",
    resource: "system",
    action: "manage",
    description: "Manage platform-wide system configuration",
  },
  {
    key: "admin:access",
    resource: "admin",
    action: "access",
    description: "Access the super admin console",
  },
  {
    key: "audit:read",
    resource: "audit",
    action: "read",
    description: "View audit logs and security events",
  },
  {
    key: "security:manage",
    resource: "security",
    action: "manage",
    description: "Manage security center actions (unlock accounts, terminate sessions)",
  },
  {
    key: "settings:manage",
    resource: "settings",
    action: "manage",
    description: "Manage company and application settings",
  },
  {
    key: "integrations:read",
    resource: "integrations",
    action: "read",
    description: "View Integration Center and allowed connection status",
  },
  {
    key: "integrations:manage",
    resource: "integrations",
    action: "manage",
    description: "Connect, disconnect, and test third-party integrations",
  },
  {
    key: "users:manage",
    resource: "users",
    action: "manage",
    description: "Create, update, and deactivate user accounts",
  },
  {
    key: "team:manage",
    resource: "team",
    action: "manage",
    description: "Manage team members, departments, and assignments",
  },
  {
    key: "team:read",
    resource: "team",
    action: "read",
    description: "View team member directory and profiles",
  },

  // Clients
  {
    key: "clients:read",
    resource: "clients",
    action: "read",
    description: "View client records and profiles",
  },
  {
    key: "clients:write",
    resource: "clients",
    action: "write",
    description: "Create and update client records",
  },
  {
    key: "clients:delete",
    resource: "clients",
    action: "delete",
    description: "Delete or archive client records",
  },

  // Projects
  {
    key: "projects:read",
    resource: "projects",
    action: "read",
    description: "View project records and details",
  },
  {
    key: "projects:write",
    resource: "projects",
    action: "write",
    description: "Create and update projects",
  },
  {
    key: "projects:delete",
    resource: "projects",
    action: "delete",
    description: "Delete or archive projects",
  },

  // Customer Requests (Phase 2 intake)
  {
    key: "customer-requests:create",
    resource: "customer-requests",
    action: "create",
    description: "Create and submit customer work requests",
  },
  {
    key: "customer-requests:read",
    resource: "customer-requests",
    action: "read",
    description: "View customer work requests",
  },
  {
    key: "customer-requests:review",
    resource: "customer-requests",
    action: "review",
    description: "Review, clarify, approve, reject, and convert customer requests",
  },

  // Tasks
  {
    key: "tasks:read",
    resource: "tasks",
    action: "read",
    description: "View tasks and task details",
  },
  {
    key: "tasks:write",
    resource: "tasks",
    action: "write",
    description: "Create and update tasks",
  },
  {
    key: "tasks:delete",
    resource: "tasks",
    action: "delete",
    description: "Delete tasks",
  },

  // Invoices
  {
    key: "invoices:read",
    resource: "invoices",
    action: "read",
    description: "View invoices and billing records",
  },
  {
    key: "invoices:write",
    resource: "invoices",
    action: "write",
    description: "Create and update invoices",
  },
  {
    key: "invoices:send",
    resource: "invoices",
    action: "send",
    description: "Send invoices to clients",
  },
  {
    key: "invoices:delete",
    resource: "invoices",
    action: "delete",
    description: "Cancel or delete invoices",
  },

  // Quotes (Phase 3 commercial foundation)
  {
    key: "quotes:read",
    resource: "quotes",
    action: "read",
    description: "View quotes, payment schedules, and commercial status",
  },
  {
    key: "quotes:write",
    resource: "quotes",
    action: "write",
    description: "Create and update quotes and payment schedules",
  },
  {
    key: "quotes:send",
    resource: "quotes",
    action: "send",
    description: "Send quotes to customers",
  },
  {
    key: "quotes:approve",
    resource: "quotes",
    action: "approve",
    description: "Approve or reject quotes assigned to the customer",
  },

  // Payments (Phase 4 Pakistan execution)
  {
    key: "payments:read",
    resource: "payments",
    action: "read",
    description: "View payments, schedules, and verification status",
  },
  {
    key: "payments:pay",
    resource: "payments",
    action: "pay",
    description: "Initiate or submit a customer payment",
  },
  {
    key: "payments:verify",
    resource: "payments",
    action: "verify",
    description: "Verify or reject customer payments",
  },
  {
    key: "payments:configure",
    resource: "payments",
    action: "configure",
    description: "Enable payment methods and bank details",
  },
  {
    key: "payments:refund",
    resource: "payments",
    action: "refund",
    description: "Record and authorize payment refunds",
  },

  // Reports
  {
    key: "reports:read",
    resource: "reports",
    action: "read",
    description: "View business reports and analytics",
  },
  {
    key: "reports:export",
    resource: "reports",
    action: "export",
    description: "Export reports to PDF or spreadsheet",
  },

  // Calendar
  {
    key: "calendar:read",
    resource: "calendar",
    action: "read",
    description: "View calendar events and schedules",
  },
  {
    key: "calendar:write",
    resource: "calendar",
    action: "write",
    description: "Create and update calendar events",
  },

  // Files
  {
    key: "files:read",
    resource: "files",
    action: "read",
    description: "View and download files",
  },
  {
    key: "files:upload",
    resource: "files",
    action: "upload",
    description: "Upload files and attachments",
  },
  {
    key: "files:delete",
    resource: "files",
    action: "delete",
    description: "Delete files and attachments",
  },

  // AI & Communication
  {
    key: "ai:use",
    resource: "ai",
    action: "use",
    description: "Use AI assistant and document generation features",
  },
  {
    key: "notifications:read",
    resource: "notifications",
    action: "read",
    description: "View in-app notifications",
  },
  {
    key: "chat:read",
    resource: "chat",
    action: "read",
    description: "View conversations, activity feed, and comments",
  },
  {
    key: "chat:write",
    resource: "chat",
    action: "write",
    description: "Send messages in team and client chat",
  },

  // Phase 20 — Enterprise Communication Hub
  {
    key: "communication:read",
    resource: "communication",
    action: "read",
    description: "View messages, channels, announcements, threads, and meetings",
  },
  {
    key: "communication:write",
    resource: "communication",
    action: "write",
    description: "Send messages, post replies, and participate in channels",
  },
  {
    key: "communication:manage",
    resource: "communication",
    action: "manage",
    description: "Manage channels, pin messages, and moderate conversations",
  },
  {
    key: "announcement:manage",
    resource: "announcement",
    action: "manage",
    description: "Create, update, pin, and expire organization announcements",
  },
  {
    key: "meeting:manage",
    resource: "meeting",
    action: "manage",
    description: "Schedule meetings and manage waiting room / recording metadata",
  },
  {
    key: "thread:manage",
    resource: "thread",
    action: "manage",
    description: "Resolve, pin, and moderate discussion threads",
  },
  {
    key: "whiteboards:read",
    resource: "whiteboards",
    action: "read",
    description: "View whiteboards and canvas content",
  },
  {
    key: "whiteboards:write",
    resource: "whiteboards",
    action: "write",
    description: "Create, update, duplicate, and rename whiteboards",
  },
  {
    key: "whiteboards:delete",
    resource: "whiteboards",
    action: "delete",
    description: "Delete whiteboards",
  },
];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((permission) => permission.key);
