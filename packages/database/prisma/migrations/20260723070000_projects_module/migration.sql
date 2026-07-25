-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "project_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "milestone_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "client_id" UUID,
    "status" "project_status" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" "project_priority" NOT NULL DEFAULT 'MEDIUM',
    "start_date" DATE,
    "due_date" DATE,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "budget" DECIMAL(14,2),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_label" VARCHAR(100),
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_milestones" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "due_date" DATE,
    "status" "milestone_status" NOT NULL DEFAULT 'PENDING',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_attachments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(2048) NOT NULL,
    "mime_type" VARCHAR(120),
    "size_bytes" INTEGER,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_attachments_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "projects_name_idx" ON "projects"("name");
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "projects_priority_idx" ON "projects"("priority");
CREATE INDEX "projects_client_id_idx" ON "projects"("client_id");
CREATE INDEX "projects_due_date_idx" ON "projects"("due_date");
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");
CREATE INDEX "projects_created_by_id_idx" ON "projects"("created_by_id");
CREATE INDEX "projects_created_at_idx" ON "projects"("created_at");

CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");
CREATE INDEX "project_members_project_id_idx" ON "project_members"("project_id");

CREATE INDEX "project_milestones_project_id_sort_order_idx" ON "project_milestones"("project_id", "sort_order");
CREATE INDEX "project_milestones_due_date_idx" ON "project_milestones"("due_date");

CREATE INDEX "project_attachments_project_id_idx" ON "project_attachments"("project_id");
CREATE INDEX "project_attachments_uploaded_by_id_idx" ON "project_attachments"("uploaded_by_id");

-- users.company_id already exists from auth migrations; ensure index + FK to clients
CREATE INDEX IF NOT EXISTS "users_company_id_idx" ON "users"("company_id");

-- Foreign keys
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_attachments" ADD CONSTRAINT "project_attachments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_attachments" ADD CONSTRAINT "project_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
