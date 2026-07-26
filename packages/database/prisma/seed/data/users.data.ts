import { ROLE_CODES } from "./roles.data";

export interface UserSeedDefinition {
  email: string;
  firstName: string;
  lastName: string;
  roleCode: (typeof ROLE_CODES)[keyof typeof ROLE_CODES];
  status: "PENDING_VERIFICATION" | "ACTIVE" | "LOCKED" | "DEACTIVATED";
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
}

export const DEMO_USERS: UserSeedDefinition[] = [
  {
    email: "superadmin@eliteflow.dev",
    firstName: "Super",
    lastName: "Admin",
    roleCode: ROLE_CODES.SUPER_ADMIN,
    status: "ACTIVE",
    emailVerified: true,
  },
  {
    email: "admin@eliteflow.dev",
    firstName: "Alex",
    lastName: "Morgan",
    roleCode: ROLE_CODES.ADMIN,
    status: "ACTIVE",
    emailVerified: true,
    // Keep false until Resend has a verified sending domain — production
    // LOGIN_2FA currently hard-fails when Resend is in testing mode.
    twoFactorEnabled: false,
  },
  {
    email: "employee@eliteflow.dev",
    firstName: "Jordan",
    lastName: "Lee",
    roleCode: ROLE_CODES.EMPLOYEE,
    status: "ACTIVE",
    emailVerified: true,
  },
  {
    email: "client@eliteflow.dev",
    firstName: "Taylor",
    lastName: "Brooks",
    roleCode: ROLE_CODES.CLIENT,
    status: "ACTIVE",
    emailVerified: true,
  },
];
