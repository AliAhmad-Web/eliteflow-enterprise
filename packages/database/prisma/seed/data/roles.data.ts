export const ROLE_CODES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  EMPLOYEE: "EMPLOYEE",
  CLIENT: "CLIENT",
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export interface RoleSeedDefinition {
  code: RoleCode;
  name: string;
  description: string;
  isSystem: boolean;
}

export const ROLES: RoleSeedDefinition[] = [
  {
    code: ROLE_CODES.SUPER_ADMIN,
    name: "Super Admin",
    description:
      "Platform-wide administrator with full system access, audit visibility, and configuration control.",
    isSystem: true,
  },
  {
    code: ROLE_CODES.ADMIN,
    name: "Admin",
    description:
      "Company-level administrator managing employees, clients, projects, billing, and reports.",
    isSystem: true,
  },
  {
    code: ROLE_CODES.EMPLOYEE,
    name: "Employee",
    description:
      "Team member with access to assigned projects, tasks, calendar, and collaboration tools.",
    isSystem: true,
  },
  {
    code: ROLE_CODES.CLIENT,
    name: "Client",
    description:
      "External client with portal access to their own projects, invoices, and documents.",
    isSystem: true,
  },
];
