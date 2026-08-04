-- CreateEnum
CREATE TYPE "marital_status" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'PREFER_NOT_TO_SAY');
CREATE TYPE "employee_lifecycle_stage" AS ENUM ('HIRING', 'ONBOARDING', 'ACTIVE', 'PROBATION', 'TRANSFERRED', 'PROMOTED', 'EXITING', 'EXITED');
CREATE TYPE "employee_document_type" AS ENUM ('CV', 'CONTRACT', 'OFFER_LETTER', 'CNIC', 'PASSPORT', 'CERTIFICATE', 'DEGREE', 'EXPERIENCE_LETTER', 'NDA', 'MEDICAL', 'POLICY', 'OTHER');
CREATE TYPE "work_shift" AS ENUM ('MORNING', 'EVENING', 'NIGHT', 'FLEXIBLE', 'REMOTE');

-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable employee_profiles
ALTER TABLE "employee_profiles"
  ADD COLUMN IF NOT EXISTS "badge_number" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "qr_token" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "lifecycle_stage" "employee_lifecycle_stage" NOT NULL DEFAULT 'ONBOARDING',
  ADD COLUMN IF NOT EXISTS "shift" "work_shift" NOT NULL DEFAULT 'MORNING',
  ADD COLUMN IF NOT EXISTS "marital_status" "marital_status",
  ADD COLUMN IF NOT EXISTS "blood_group" VARCHAR(8),
  ADD COLUMN IF NOT EXISTS "father_name" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "exit_date" DATE,
  ADD COLUMN IF NOT EXISTS "exit_reason" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "personal_email" VARCHAR(320),
  ADD COLUMN IF NOT EXISTS "company_email" VARCHAR(320),
  ADD COLUMN IF NOT EXISTS "city" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "country" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "casual_leave_balance" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "medical_leave_balance" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "employee_profiles_badge_number_key" ON "employee_profiles"("badge_number");
CREATE UNIQUE INDEX IF NOT EXISTS "employee_profiles_qr_token_key" ON "employee_profiles"("qr_token");
CREATE INDEX IF NOT EXISTS "employee_profiles_lifecycle_stage_idx" ON "employee_profiles"("lifecycle_stage");

-- CreateTable employee_documents
CREATE TABLE IF NOT EXISTS "employee_documents" (
  "id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "type" "employee_document_type" NOT NULL DEFAULT 'OTHER',
  "title" VARCHAR(200) NOT NULL,
  "file_url" VARCHAR(2048) NOT NULL,
  "file_name" VARCHAR(255),
  "mime_type" VARCHAR(120),
  "file_size" INTEGER,
  "notes" VARCHAR(500),
  "uploaded_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employee_documents_employee_id_type_idx" ON "employee_documents"("employee_id", "type");
CREATE INDEX IF NOT EXISTS "employee_documents_deleted_at_idx" ON "employee_documents"("deleted_at");

DO $$ BEGIN
  ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_uploaded_by_id_fkey"
    FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable employee_promotions
CREATE TABLE IF NOT EXISTS "employee_promotions" (
  "id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "effective_date" DATE NOT NULL,
  "old_designation" VARCHAR(120),
  "new_designation" VARCHAR(120) NOT NULL,
  "old_salary" DECIMAL(14,2),
  "new_salary" DECIMAL(14,2),
  "reason" VARCHAR(1000),
  "acted_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "employee_promotions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employee_promotions_employee_id_idx" ON "employee_promotions"("employee_id");
CREATE INDEX IF NOT EXISTS "employee_promotions_deleted_at_idx" ON "employee_promotions"("deleted_at");

DO $$ BEGIN
  ALTER TABLE "employee_promotions" ADD CONSTRAINT "employee_promotions_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employee_promotions" ADD CONSTRAINT "employee_promotions_acted_by_id_fkey"
    FOREIGN KEY ("acted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable employee_transfers
CREATE TABLE IF NOT EXISTS "employee_transfers" (
  "id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "effective_date" DATE NOT NULL,
  "from_department_id" UUID,
  "to_department_id" UUID,
  "from_team_id" UUID,
  "to_team_id" UUID,
  "from_manager_id" UUID,
  "to_manager_id" UUID,
  "reason" VARCHAR(1000),
  "acted_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "employee_transfers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employee_transfers_employee_id_idx" ON "employee_transfers"("employee_id");
CREATE INDEX IF NOT EXISTS "employee_transfers_deleted_at_idx" ON "employee_transfers"("deleted_at");

DO $$ BEGIN
  ALTER TABLE "employee_transfers" ADD CONSTRAINT "employee_transfers_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employee_transfers" ADD CONSTRAINT "employee_transfers_acted_by_id_fkey"
    FOREIGN KEY ("acted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable employee_timeline_events
CREATE TABLE IF NOT EXISTS "employee_timeline_events" (
  "id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "event_type" VARCHAR(80) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" VARCHAR(2000),
  "metadata" JSONB,
  "acted_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employee_timeline_events_employee_id_created_at_idx" ON "employee_timeline_events"("employee_id", "created_at");
CREATE INDEX IF NOT EXISTS "employee_timeline_events_event_type_idx" ON "employee_timeline_events"("event_type");

DO $$ BEGIN
  ALTER TABLE "employee_timeline_events" ADD CONSTRAINT "employee_timeline_events_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employee_timeline_events" ADD CONSTRAINT "employee_timeline_events_acted_by_id_fkey"
    FOREIGN KEY ("acted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
