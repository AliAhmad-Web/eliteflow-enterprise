import type { OtpPurpose, SafeUser, UserRole } from "@enterprise/shared";
import type { Role, User } from "@enterprise/database";

export interface UserWithRoleAndPermissions extends User {
  role: Role & {
    rolePermissions: Array<{
      permission: {
        key: string;
      };
    }>;
  };
}

export interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

export interface AuthSessionResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
}

export interface SignupServiceInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginServiceInput {
  email: string;
  password: string;
}

export interface LoginOtpChallengeResult {
  requiresOtp: true;
  otpSessionId: string;
  expiresIn: number;
}

export interface LoginSessionResult {
  requiresOtp?: false;
  user: ReturnType<typeof toSafeUser>;
  tokens: {
    accessToken: string;
    expiresIn: number;
    tokenType: "Bearer";
  };
  refreshToken: string;
}

export type LoginServiceResult = LoginOtpChallengeResult | LoginSessionResult;

export interface OtpChallengeResult {
  otpSessionId: string;
  expiresIn: number;
}

export interface VerifyOtpLoginResult {
  purpose: typeof OtpPurpose.LOGIN_2FA;
  user: ReturnType<typeof toSafeUser>;
  tokens: {
    accessToken: string;
    expiresIn: number;
    tokenType: "Bearer";
  };
  refreshToken: string;
}

export interface VerifyOtpSensitiveActionResult {
  purpose: typeof OtpPurpose.SENSITIVE_ACTION;
  verified: true;
  message: string;
}

export type VerifyOtpServiceResult =
  | VerifyOtpLoginResult
  | VerifyOtpSensitiveActionResult;

export type SafeUserMapperInput = UserWithRoleAndPermissions;

export { parseDeviceName } from "./auth.device.js";

export function toSafeUser(user: SafeUserMapperInput): SafeUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: {
      id: user.role.id,
      code: user.role.code as UserRole,
      name: user.role.name,
    },
    status: user.status,
    emailVerified: user.emailVerified,
    permissions: user.role.rolePermissions.map((rp) => rp.permission.key),
    mustChangePassword: Boolean(
      (user as { mustChangePassword?: boolean }).mustChangePassword,
    ),
    createdAt: user.createdAt.toISOString(),
  };
}
