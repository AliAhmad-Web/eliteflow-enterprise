import type { OAuthProvider, OtpPurpose, SessionStatus, UserRole, UserStatus } from "../enums/auth.enums.js";

// =============================================================================
// Domain Entities
// =============================================================================

/** Full permission record as returned by the API. */
export interface Permission {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string;
}

/** Role record with optional embedded permissions. */
export interface Role {
  id: string;
  code: UserRole;
  name: string;
  description: string;
  isSystem: boolean;
  permissions?: Permission[];
}

/** Full user entity (internal / admin views). Never expose passwordHash to clients. */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  roleId: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  failedLoginCount: number;
  lockedUntil: string | null;
  companyId: string | null;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

/** User data safe for client consumption — excludes sensitive/internal fields. */
export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: Pick<Role, "id" | "code" | "name">;
  status: UserStatus;
  emailVerified: boolean;
  permissions: string[];
  createdAt: string;
}

/** Device session as returned by session management endpoints. */
export interface Session {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  deviceType: string;
  ipAddress: string;
  userAgent: string;
  country: string | null;
  status: SessionStatus;
  lastActiveAt: string;
  revokedAt: string | null;
  createdAt: string;
  isCurrent: boolean;
}

// =============================================================================
// Auth Request DTOs
// =============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyOtpRequest {
  otpSessionId: string;
  code: string;
}

/** Refresh token is transmitted via HttpOnly cookie; body is optional. */
export interface RefreshTokenRequest {
  refreshToken?: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendOtpRequest {
  otpSessionId: string;
}

export interface OAuthCallbackRequest {
  provider: OAuthProvider;
  supabaseAccessToken: string;
}

// =============================================================================
// Auth Response DTOs
// =============================================================================

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

export interface LoginResponse {
  user: SafeUser;
  tokens?: AuthTokens;
  requiresOtp?: boolean;
  otpSessionId?: string;
}

export interface SignupResponse {
  message: string;
  email: string;
  emailSent: boolean;
  emailError?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface VerifyOtpResponse {
  user: SafeUser;
  tokens: AuthTokens;
}

export interface SessionListResponse {
  sessions: Session[];
}

/** JWT access token payload claims (decoded, not signed). */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/** Context attached to authenticated requests after middleware verification. */
export interface AuthenticatedContext {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
  sessionId: string;
}

export type { OtpPurpose };
