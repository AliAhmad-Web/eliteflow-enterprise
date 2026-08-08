-- Phase 3 Step 9 — Enterprise Data Retention & Secure Deletion

CREATE TYPE "retention_lifecycle_status" AS ENUM (
  'ACTIVE',
  'ARCHIVED',
  'LEGAL_HOLD',
  'PENDING_DELETION',
  'SECURE_DELETED'
);

CREATE TYPE "retention_entity_type" AS ENUM (
  'AUDIT_LOGS',
  'AI_MEMORY',
  'AI_DOCUMENTS',
  'FILES',
  'COMMUNICATIONS',
  'PROJECTS',
  'TASKS',
  'HR_DOCUMENTS',
  'NOTIFICATIONS',
  'REPORTS'
);

CREATE TYPE "retention_job_run_status" AS ENUM (
  'RUNNING',
  'COMPLETED',
  'FAILED'
);

CREATE TABLE IF NOT EXISTS "legal_holds" (
  "id" UUID NOT NULL,
  "entity_type" "retention_entity_type" NOT NULL,
  "entity_id" UUID,
  "reason" VARCHAR(500) NOT NULL,
  "held_by_user_id" UUID,
  "held_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "released_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "legal_holds_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "legal_holds_entity_type_is_active_idx"
  ON "legal_holds"("entity_type", "is_active");
CREATE INDEX IF NOT EXISTS "legal_holds_entity_type_entity_id_is_active_idx"
  ON "legal_holds"("entity_type", "entity_id", "is_active");

CREATE TABLE IF NOT EXISTS "retention_lifecycles" (
  "id" UUID NOT NULL,
  "entity_type" "retention_entity_type" NOT NULL,
  "entity_id" UUID NOT NULL,
  "status" "retention_lifecycle_status" NOT NULL DEFAULT 'ACTIVE',
  "archived_at" TIMESTAMP(3),
  "pending_deletion_at" TIMESTAMP(3),
  "secure_deleted_at" TIMESTAMP(3),
  "notes" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "retention_lifecycles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "retention_lifecycles_entity_type_entity_id_key"
  ON "retention_lifecycles"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "retention_lifecycles_entity_type_status_idx"
  ON "retention_lifecycles"("entity_type", "status");
CREATE INDEX IF NOT EXISTS "retention_lifecycles_status_updated_at_idx"
  ON "retention_lifecycles"("status", "updated_at");

CREATE TABLE IF NOT EXISTS "retention_job_runs" (
  "id" UUID NOT NULL,
  "status" "retention_job_run_status" NOT NULL DEFAULT 'RUNNING',
  "triggered_by" VARCHAR(80),
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "execution_time_ms" INTEGER,
  "items_archived" INTEGER NOT NULL DEFAULT 0,
  "items_deleted" INTEGER NOT NULL DEFAULT 0,
  "legal_holds_skipped" INTEGER NOT NULL DEFAULT 0,
  "failures" INTEGER NOT NULL DEFAULT 0,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "retention_job_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "retention_job_runs_started_at_idx"
  ON "retention_job_runs"("started_at");
CREATE INDEX IF NOT EXISTS "retention_job_runs_status_started_at_idx"
  ON "retention_job_runs"("status", "started_at");
