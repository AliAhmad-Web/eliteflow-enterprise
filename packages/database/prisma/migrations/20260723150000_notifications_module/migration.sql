-- CreateEnum
CREATE TYPE "notification_category" AS ENUM ('SYSTEM', 'SECURITY', 'TASK', 'PROJECT', 'INVOICE', 'CALENDAR', 'FILE', 'TEAM', 'AI', 'AUTH');
CREATE TYPE "notification_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "notification_channel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'SMS', 'WHATSAPP');
CREATE TYPE "notification_queue_status" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "category" "notification_category" NOT NULL DEFAULT 'SYSTEM',
    "priority" "notification_priority" NOT NULL DEFAULT 'NORMAL',
    "channel" "notification_channel" NOT NULL DEFAULT 'IN_APP',
    "link_url" VARCHAR(500),
    "entity_type" VARCHAR(80),
    "entity_id" UUID,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "notification_category" NOT NULL,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" "notification_category" NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "body_template" TEXT NOT NULL,
    "email_template" TEXT,
    "channels" "notification_channel"[] NOT NULL DEFAULT ARRAY['IN_APP', 'EMAIL']::"notification_channel"[],
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_queue" (
    "id" UUID NOT NULL,
    "notification_id" UUID,
    "user_id" UUID NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "status" "notification_queue_status" NOT NULL DEFAULT 'PENDING',
    "to_address" VARCHAR(320),
    "subject" VARCHAR(200),
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(1000),
    "scheduled_for" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_audits" (
    "id" UUID NOT NULL,
    "notification_id" UUID,
    "user_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_preferences_user_id_category_key" ON "notification_preferences"("user_id", "category");
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notification_templates"("code");

CREATE INDEX "notifications_user_id_is_read_deleted_at_idx" ON "notifications"("user_id", "is_read", "deleted_at");
CREATE INDEX "notifications_user_id_is_archived_deleted_at_idx" ON "notifications"("user_id", "is_archived", "deleted_at");
CREATE INDEX "notifications_category_idx" ON "notifications"("category");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");
CREATE INDEX "notification_templates_category_idx" ON "notification_templates"("category");
CREATE INDEX "notification_templates_deleted_at_idx" ON "notification_templates"("deleted_at");
CREATE INDEX "notification_queue_status_scheduled_for_idx" ON "notification_queue"("status", "scheduled_for");
CREATE INDEX "notification_queue_user_id_idx" ON "notification_queue"("user_id");
CREATE INDEX "notification_audits_user_id_created_at_idx" ON "notification_audits"("user_id", "created_at");
CREATE INDEX "notification_audits_notification_id_idx" ON "notification_audits"("notification_id");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_audits" ADD CONSTRAINT "notification_audits_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_audits" ADD CONSTRAINT "notification_audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
