-- Add optional email-based two-factor authentication flag to users.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;
