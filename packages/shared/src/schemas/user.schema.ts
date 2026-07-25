import { z } from "zod";

import {
  avatarUrlSchema,
  firstNameSchema,
  lastNameSchema,
  passwordSchema,
} from "./common.schema.js";

// =============================================================================
// Update Profile
// =============================================================================

export const updateProfileSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  avatarUrl: avatarUrlSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// =============================================================================
// Change Password
// =============================================================================

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Current password is required" })
      .min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string({
      required_error: "Please confirm your new password",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// =============================================================================
// Response Schemas (optional runtime validation)
// =============================================================================

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  avatarUrl: z.string().nullable(),
  status: z.string(),
  emailVerified: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserProfileOutput = z.infer<typeof userProfileSchema>;
