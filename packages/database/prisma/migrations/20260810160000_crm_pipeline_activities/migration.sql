-- CRM MVP: sales pipeline stage + client activities

CREATE TYPE "client_pipeline_stage" AS ENUM (
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST'
);

CREATE TYPE "client_activity_type" AS ENUM (
  'NOTE',
  'CALL',
  'EMAIL',
  'MEETING',
  'STATUS_CHANGE',
  'OTHER'
);

ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "pipeline_stage" "client_pipeline_stage";

-- Backfill: existing LEAD rows start in NEW; ACTIVE/INACTIVE map to WON/LOST for board honesty.
UPDATE "clients"
SET "pipeline_stage" = 'NEW'
WHERE "deleted_at" IS NULL
  AND "status" = 'LEAD'
  AND "pipeline_stage" IS NULL;

UPDATE "clients"
SET "pipeline_stage" = 'WON'
WHERE "deleted_at" IS NULL
  AND "status" = 'ACTIVE'
  AND "pipeline_stage" IS NULL;

UPDATE "clients"
SET "pipeline_stage" = 'LOST'
WHERE "deleted_at" IS NULL
  AND "status" = 'INACTIVE'
  AND "pipeline_stage" IS NULL;

CREATE INDEX IF NOT EXISTS "clients_pipeline_stage_idx" ON "clients"("pipeline_stage");

CREATE TABLE "client_activities" (
  "id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "type" "client_activity_type" NOT NULL DEFAULT 'NOTE',
  "title" VARCHAR(200) NOT NULL,
  "body" VARCHAR(5000),
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "client_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_activities_client_id_occurred_at_idx" ON "client_activities"("client_id", "occurred_at");
CREATE INDEX "client_activities_type_idx" ON "client_activities"("type");
CREATE INDEX "client_activities_deleted_at_idx" ON "client_activities"("deleted_at");
CREATE INDEX "client_activities_created_by_id_idx" ON "client_activities"("created_by_id");

ALTER TABLE "client_activities"
  ADD CONSTRAINT "client_activities_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_activities"
  ADD CONSTRAINT "client_activities_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
