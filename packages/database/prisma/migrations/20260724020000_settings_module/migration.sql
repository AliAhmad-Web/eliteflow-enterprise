-- Phase 18: Enterprise Settings

CREATE TYPE "theme_mode_preference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');
CREATE TYPE "sidebar_style" AS ENUM ('DEFAULT', 'COMPACT', 'EXPANDED');
CREATE TYPE "font_size_preference" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');
CREATE TYPE "border_radius_preference" AS ENUM ('NONE', 'DEFAULT', 'ROUNDED');
CREATE TYPE "dashboard_density" AS ENUM ('COMPACT', 'COMFORTABLE', 'SPACIOUS');
CREATE TYPE "app_language" AS ENUM ('EN', 'UR', 'AR');
CREATE TYPE "integration_provider" AS ENUM ('OPENAI', 'RESEND', 'STRIPE', 'SUPABASE', 'CLOUDINARY', 'GOOGLE', 'GITHUB', 'GEMINI', 'OTHER');
CREATE TYPE "backup_type" AS ENUM ('MANUAL', 'AUTO');
CREATE TYPE "backup_status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "billing_plan_status" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING');
CREATE TYPE "account_deletion_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

ALTER TABLE "users" ADD COLUMN "username" VARCHAR(50),
ADD COLUMN "phone" VARCHAR(30),
ADD COLUMN "bio" VARCHAR(1000),
ADD COLUMN "designation" VARCHAR(120);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

CREATE TABLE "organization_settings" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "logo_url" VARCHAR(2048),
    "brand_color" VARCHAR(20),
    "website" VARCHAR(500),
    "address_line1" VARCHAR(255),
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(30),
    "country" VARCHAR(100),
    "tax_number" VARCHAR(100),
    "registration_number" VARCHAR(100),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "email_from_name" VARCHAR(200),
    "email_from_address" VARCHAR(320),
    "email_reply_to" VARCHAR(320),
    "storage_provider" VARCHAR(50),
    "storage_quota_bytes" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_settings_key_key" ON "organization_settings"("key");

CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "theme_mode" "theme_mode_preference" NOT NULL DEFAULT 'SYSTEM',
    "sidebar_style" "sidebar_style" NOT NULL DEFAULT 'DEFAULT',
    "compact_mode" BOOLEAN NOT NULL DEFAULT false,
    "font_size" "font_size_preference" NOT NULL DEFAULT 'MEDIUM',
    "border_radius" "border_radius_preference" NOT NULL DEFAULT 'DEFAULT',
    "accent_color" VARCHAR(20),
    "dashboard_density" "dashboard_density" NOT NULL DEFAULT 'COMFORTABLE',
    "language" "app_language" NOT NULL DEFAULT 'EN',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "date_format" VARCHAR(30) NOT NULL DEFAULT 'YYYY-MM-DD',
    "time_format" VARCHAR(10) NOT NULL DEFAULT '24h',
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "push_notifications" BOOLEAN NOT NULL DEFAULT true,
    "desktop_notifications" BOOLEAN NOT NULL DEFAULT true,
    "sms_notifications" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_notifications" BOOLEAN NOT NULL DEFAULT false,
    "ai_provider" VARCHAR(50),
    "ai_model" VARCHAR(100),
    "ai_temperature" DOUBLE PRECISION,
    "ai_max_tokens" INTEGER,
    "ai_history_enabled" BOOLEAN NOT NULL DEFAULT true,
    "ai_privacy_mode" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_preferred" BOOLEAN NOT NULL DEFAULT false,
    "session_timeout_minutes" INTEGER NOT NULL DEFAULT 480,
    "login_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "device_trust_enabled" BOOLEAN NOT NULL DEFAULT false,
    "password_policy_strict" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

CREATE TABLE "integration_credentials" (
    "id" UUID NOT NULL,
    "provider" "integration_provider" NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "encrypted_secret" TEXT NOT NULL,
    "iv" VARCHAR(64) NOT NULL,
    "auth_tag" VARCHAR(64) NOT NULL,
    "secret_last4" VARCHAR(8) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "last_rotated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_credentials_provider_label_key" ON "integration_credentials"("provider", "label");
CREATE INDEX "integration_credentials_provider_deleted_at_idx" ON "integration_credentials"("provider", "deleted_at");
CREATE INDEX "integration_credentials_created_by_id_idx" ON "integration_credentials"("created_by_id");

CREATE TABLE "backup_records" (
    "id" UUID NOT NULL,
    "type" "backup_type" NOT NULL,
    "status" "backup_status" NOT NULL DEFAULT 'PENDING',
    "triggered_by" UUID,
    "storage_key" VARCHAR(500),
    "size_bytes" BIGINT,
    "checksum" VARCHAR(128),
    "message" VARCHAR(500),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "backup_records_status_created_at_idx" ON "backup_records"("status", "created_at");
CREATE INDEX "backup_records_type_created_at_idx" ON "backup_records"("type", "created_at");

CREATE TABLE "organization_billing" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "plan_code" VARCHAR(50) NOT NULL DEFAULT 'starter',
    "plan_name" VARCHAR(100) NOT NULL DEFAULT 'Starter',
    "status" "billing_plan_status" NOT NULL DEFAULT 'ACTIVE',
    "seats_included" INTEGER NOT NULL DEFAULT 10,
    "seats_used" INTEGER NOT NULL DEFAULT 0,
    "storage_quota_bytes" BIGINT NOT NULL DEFAULT 5368709120,
    "storage_used_bytes" BIGINT NOT NULL DEFAULT 0,
    "ai_credits_included" INTEGER NOT NULL DEFAULT 1000,
    "ai_credits_used" INTEGER NOT NULL DEFAULT 0,
    "billing_email" VARCHAR(320),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_billing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_billing_key_key" ON "organization_billing"("key");

CREATE TABLE "account_deletion_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reason" VARCHAR(500),
    "status" "account_deletion_status" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "processed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "account_deletion_requests_user_id_status_idx" ON "account_deletion_requests"("user_id", "status");
CREATE INDEX "account_deletion_requests_status_requested_at_idx" ON "account_deletion_requests"("status", "requested_at");

ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "backup_records" ADD CONSTRAINT "backup_records_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
