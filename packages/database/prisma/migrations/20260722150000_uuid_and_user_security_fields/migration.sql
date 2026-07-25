-- =============================================================================
-- Migration: uuid_and_user_security_fields
-- Description:
--   1. Enable PostgreSQL UUID generation (Supabase-compatible)
--   2. Add/rename User security fields for lockout and password rotation
--   3. Optimize authentication indexes
--   4. Convert all primary/foreign key columns from TEXT (CUID) to native UUID
--
-- IMPORTANT — Data impact:
--   CUID values cannot be cast to UUID. Existing rows in auth tables must be
--   cleared before the type conversion. Run `npm run seed` after this migration
--   to restore roles, permissions, and demo users with new UUID identifiers.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- STEP 2: User security fields
-- -----------------------------------------------------------------------------
ALTER TABLE "users" RENAME COLUMN "failed_login_attempts" TO "failed_login_count";

ALTER TABLE "users" ADD COLUMN "password_changed_at" TIMESTAMP(3);

-- -----------------------------------------------------------------------------
-- STEP 3: Index optimization
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS "users_company_id_idx";
DROP INDEX IF EXISTS "users_deleted_at_idx";
DROP INDEX IF EXISTS "sessions_revoked_at_idx";
DROP INDEX IF EXISTS "refresh_tokens_user_id_idx";
DROP INDEX IF EXISTS "permissions_resource_idx";
DROP INDEX IF EXISTS "email_verification_tokens_user_id_idx";
DROP INDEX IF EXISTS "password_reset_tokens_user_id_idx";
DROP INDEX IF EXISTS "otp_verifications_user_id_idx";
DROP INDEX IF EXISTS "login_attempts_user_id_created_at_idx";
DROP INDEX IF EXISTS "login_attempts_success_created_at_idx";

CREATE INDEX "users_locked_until_idx" ON "users"("locked_until");

-- -----------------------------------------------------------------------------
-- STEP 4: Drop foreign keys (required before type conversion)
-- -----------------------------------------------------------------------------
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_user_id_fkey";
ALTER TABLE "login_attempts" DROP CONSTRAINT IF EXISTS "login_attempts_user_id_fkey";
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_fkey";
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_session_id_fkey";
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_user_id_fkey";
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_replaced_by_token_id_fkey";
ALTER TABLE "oauth_accounts" DROP CONSTRAINT IF EXISTS "oauth_accounts_user_id_fkey";
ALTER TABLE "email_verification_tokens" DROP CONSTRAINT IF EXISTS "email_verification_tokens_user_id_fkey";
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT IF EXISTS "password_reset_tokens_user_id_fkey";
ALTER TABLE "otp_verifications" DROP CONSTRAINT IF EXISTS "otp_verifications_user_id_fkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_id_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_role_id_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_permission_id_fkey";

-- -----------------------------------------------------------------------------
-- STEP 5: Clear auth data (CUID values are incompatible with UUID cast)
-- -----------------------------------------------------------------------------
TRUNCATE TABLE
  "audit_logs",
  "login_attempts",
  "refresh_tokens",
  "sessions",
  "oauth_accounts",
  "email_verification_tokens",
  "password_reset_tokens",
  "otp_verifications",
  "role_permissions",
  "users",
  "permissions",
  "roles"
RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- STEP 6: Convert primary key columns to UUID
-- -----------------------------------------------------------------------------
ALTER TABLE "roles" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "roles" ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "permissions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "permissions" ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "permissions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "sessions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "sessions" ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "sessions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "oauth_accounts" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "oauth_accounts" ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "oauth_accounts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "email_verification_tokens" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "email_verification_tokens" ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "email_verification_tokens" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "password_reset_tokens" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "password_reset_tokens" ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "password_reset_tokens" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "otp_verifications" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "otp_verifications" ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "otp_verifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "audit_logs" ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "audit_logs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "login_attempts" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "login_attempts" ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "login_attempts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- -----------------------------------------------------------------------------
-- STEP 7: Convert foreign key columns to UUID
-- -----------------------------------------------------------------------------
ALTER TABLE "users" ALTER COLUMN "role_id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "users" ALTER COLUMN "company_id" SET DATA TYPE UUID USING NULL::uuid;

ALTER TABLE "role_permissions" ALTER COLUMN "role_id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "role_permissions" ALTER COLUMN "permission_id" SET DATA TYPE UUID USING gen_random_uuid();

ALTER TABLE "sessions" ALTER COLUMN "user_id" SET DATA TYPE UUID USING gen_random_uuid();

ALTER TABLE "refresh_tokens" ALTER COLUMN "session_id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "refresh_tokens" ALTER COLUMN "user_id" SET DATA TYPE UUID USING gen_random_uuid();
ALTER TABLE "refresh_tokens" ALTER COLUMN "replaced_by_token_id" SET DATA TYPE UUID USING NULL::uuid;

ALTER TABLE "oauth_accounts" ALTER COLUMN "user_id" SET DATA TYPE UUID USING gen_random_uuid();

ALTER TABLE "email_verification_tokens" ALTER COLUMN "user_id" SET DATA TYPE UUID USING gen_random_uuid();

ALTER TABLE "password_reset_tokens" ALTER COLUMN "user_id" SET DATA TYPE UUID USING gen_random_uuid();

ALTER TABLE "otp_verifications" ALTER COLUMN "user_id" SET DATA TYPE UUID USING gen_random_uuid();

ALTER TABLE "audit_logs" ALTER COLUMN "user_id" SET DATA TYPE UUID USING NULL::uuid;

ALTER TABLE "login_attempts" ALTER COLUMN "user_id" SET DATA TYPE UUID USING NULL::uuid;

-- -----------------------------------------------------------------------------
-- STEP 8: Restore foreign key constraints (enterprise cascade rules)
-- -----------------------------------------------------------------------------
ALTER TABLE "users"
  ADD CONSTRAINT "users_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
  ADD CONSTRAINT "role_permissions_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
  ADD CONSTRAINT "role_permissions_permission_id_fkey"
  FOREIGN KEY ("permission_id") REFERENCES "permissions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_replaced_by_token_id_fkey"
  FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_tokens"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "oauth_accounts"
  ADD CONSTRAINT "oauth_accounts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_verification_tokens"
  ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "otp_verifications"
  ADD CONSTRAINT "otp_verifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "login_attempts"
  ADD CONSTRAINT "login_attempts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
