-- Phase 19.1: Integration Architecture & Connection Manager

CREATE TYPE "integration_connection_status" AS ENUM ('AVAILABLE', 'CONNECTED', 'DISCONNECTED', 'ERROR', 'DISABLED');
CREATE TYPE "integration_health_status" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN');
CREATE TYPE "integration_sync_status" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');
CREATE TYPE "integration_log_level" AS ENUM ('INFO', 'WARNING', 'ERROR', 'DEBUG');

CREATE TABLE "integrations" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "provider" "integration_provider" NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "logo_key" VARCHAR(60) NOT NULL,
    "status" "integration_connection_status" NOT NULL DEFAULT 'AVAILABLE',
    "health_status" "integration_health_status" NOT NULL DEFAULT 'UNKNOWN',
    "health_message" VARCHAR(500),
    "is_connected" BOOLEAN NOT NULL DEFAULT false,
    "connected_at" TIMESTAMP(3),
    "disconnected_at" TIMESTAMP(3),
    "connected_by_id" UUID,
    "last_sync_at" TIMESTAMP(3),
    "last_health_check_at" TIMESTAMP(3),
    "config" JSONB,
    "visible_to_employee" BOOLEAN NOT NULL DEFAULT true,
    "visible_to_client" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integrations_slug_key" ON "integrations"("slug");
CREATE INDEX "integrations_status_deleted_at_idx" ON "integrations"("status", "deleted_at");
CREATE INDEX "integrations_health_status_deleted_at_idx" ON "integrations"("health_status", "deleted_at");
CREATE INDEX "integrations_is_connected_deleted_at_idx" ON "integrations"("is_connected", "deleted_at");
CREATE INDEX "integrations_provider_deleted_at_idx" ON "integrations"("provider", "deleted_at");
CREATE INDEX "integrations_sort_order_idx" ON "integrations"("sort_order");

CREATE TABLE "integration_connection_credentials" (
    "id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "key_name" VARCHAR(120) NOT NULL,
    "encrypted_secret" TEXT NOT NULL,
    "iv" VARCHAR(64) NOT NULL,
    "auth_tag" VARCHAR(64) NOT NULL,
    "secret_last4" VARCHAR(8) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "integration_connection_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_connection_credentials_integration_id_key_name_key" ON "integration_connection_credentials"("integration_id", "key_name");
CREATE INDEX "integration_connection_credentials_integration_id_deleted_at_idx" ON "integration_connection_credentials"("integration_id", "deleted_at");
CREATE INDEX "integration_connection_credentials_created_by_id_idx" ON "integration_connection_credentials"("created_by_id");

CREATE TABLE "integration_logs" (
    "id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "level" "integration_log_level" NOT NULL DEFAULT 'INFO',
    "action" VARCHAR(120) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "metadata" JSONB,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "integration_logs_integration_id_created_at_idx" ON "integration_logs"("integration_id", "created_at");
CREATE INDEX "integration_logs_level_created_at_idx" ON "integration_logs"("level", "created_at");
CREATE INDEX "integration_logs_user_id_created_at_idx" ON "integration_logs"("user_id", "created_at");

CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "encrypted_secret" TEXT,
    "iv" VARCHAR(64),
    "auth_tag" VARCHAR(64),
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_received_at" TIMESTAMP(3),
    "last_delivery_status" VARCHAR(40),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_endpoints_integration_id_deleted_at_idx" ON "webhook_endpoints"("integration_id", "deleted_at");
CREATE INDEX "webhook_endpoints_is_active_deleted_at_idx" ON "webhook_endpoints"("is_active", "deleted_at");

CREATE TABLE "sync_history" (
    "id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "status" "integration_sync_status" NOT NULL DEFAULT 'PENDING',
    "direction" VARCHAR(40) NOT NULL DEFAULT 'inbound',
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "message" VARCHAR(500),
    "metadata" JSONB,
    "triggered_by_id" UUID,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sync_history_integration_id_started_at_idx" ON "sync_history"("integration_id", "started_at");
CREATE INDEX "sync_history_status_started_at_idx" ON "sync_history"("status", "started_at");
CREATE INDEX "sync_history_triggered_by_id_started_at_idx" ON "sync_history"("triggered_by_id", "started_at");

ALTER TABLE "integrations" ADD CONSTRAINT "integrations_connected_by_id_fkey" FOREIGN KEY ("connected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "integration_connection_credentials" ADD CONSTRAINT "integration_connection_credentials_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_connection_credentials" ADD CONSTRAINT "integration_connection_credentials_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_connection_credentials" ADD CONSTRAINT "integration_connection_credentials_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sync_history" ADD CONSTRAINT "sync_history_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sync_history" ADD CONSTRAINT "sync_history_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
