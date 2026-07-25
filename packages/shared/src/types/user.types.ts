import type { UserStatus } from "../enums/auth.enums.js";

// =============================================================================
// User Profile DTOs
// =============================================================================

/** Request body for updating the authenticated user's profile. */
export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

/** Request body for changing password while authenticated. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Public user profile returned from profile endpoints. */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Response after a successful profile update. */
export interface UpdateProfileResponse {
  user: UserProfile;
}

/** Response after a successful password change. */
export interface ChangePasswordResponse {
  message: string;
}
