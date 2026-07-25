import { z } from "zod";

import { PASSWORD_RULES } from "../constants/auth.constants.js";

// =============================================================================
// Reusable Field Schemas
// =============================================================================

export const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(320, "Email must not exceed 320 characters")
  .toLowerCase();

export const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(
    PASSWORD_RULES.MIN_LENGTH,
    `Password must be at least ${PASSWORD_RULES.MIN_LENGTH} characters`,
  )
  .max(
    PASSWORD_RULES.MAX_LENGTH,
    `Password must not exceed ${PASSWORD_RULES.MAX_LENGTH} characters`,
  )
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    PASSWORD_RULES.SPECIAL_CHAR_PATTERN,
    "Password must contain at least one special character",
  );

export const firstNameSchema = z
  .string({ required_error: "First name is required" })
  .trim()
  .min(1, "First name is required")
  .max(100, "First name must not exceed 100 characters");

export const lastNameSchema = z
  .string({ required_error: "Last name is required" })
  .trim()
  .min(1, "Last name is required")
  .max(100, "Last name must not exceed 100 characters");

export const uuidSchema = z
  .string({ required_error: "ID is required" })
  .uuid("Invalid identifier format");

export const otpCodeSchema = z
  .string({ required_error: "Verification code is required" })
  .trim()
  .length(6, "Verification code must be exactly 6 digits")
  .regex(/^\d{6}$/, "Verification code must contain only numbers");

export const tokenSchema = z
  .string({ required_error: "Token is required" })
  .trim()
  .min(1, "Token is required")
  .max(512, "Token is invalid");

export const avatarUrlSchema = z
  .string()
  .trim()
  .url("Please enter a valid URL")
  .max(2048, "Avatar URL must not exceed 2048 characters")
  .nullable()
  .optional();

/** Factory for password confirmation refinement */
export function withPasswordConfirmation<
  T extends z.ZodObject<z.ZodRawShape>,
>(schema: T) {
  return schema
    .extend({
      confirmPassword: z.string({ required_error: "Please confirm your password" }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
}
