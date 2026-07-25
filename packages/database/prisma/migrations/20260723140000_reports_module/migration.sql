-- CreateEnum
CREATE TYPE "report_visibility" AS ENUM ('PRIVATE', 'TEAM', 'COMPANY');
CREATE TYPE "report_export_format" AS ENUM ('PDF', 'EXCEL', 'CSV', 'PRINT');
CREATE TYPE "report_category" AS ENUM ('OVERVIEW', 'REVENUE', 'CLIENTS', 'PROJECTS', 'TASKS', 'EMPLOYEES', 'ATTENDANCE', 'LEAVES', 'INVOICES', 'TEAM_PERFORMANCE', 'AI_INSIGHTS');

-- CreateTable
CREATE TABLE "saved_reports" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "category" "report_category" NOT NULL DEFAULT 'OVERVIEW',
    "visibility" "report_visibility" NOT NULL DEFAULT 'PRIVATE',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" UUID NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "report_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "category" "report_category" NOT NULL,
    "default_filters" JSONB NOT NULL DEFAULT '{}',
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "report_schedules" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "cron_expr" VARCHAR(80) NOT NULL,
    "format" "report_export_format" NOT NULL DEFAULT 'PDF',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "owner_id" UUID NOT NULL,
    "last_run_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "report_audits" (
    "id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "category" "report_category",
    "format" "report_export_format",
    "saved_report_id" UUID,
    "user_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saved_reports_owner_id_deleted_at_idx" ON "saved_reports"("owner_id", "deleted_at");
CREATE INDEX "saved_reports_category_idx" ON "saved_reports"("category");
CREATE INDEX "saved_reports_is_favorite_idx" ON "saved_reports"("is_favorite");
CREATE INDEX "report_templates_category_idx" ON "report_templates"("category");
CREATE INDEX "report_templates_deleted_at_idx" ON "report_templates"("deleted_at");
CREATE INDEX "report_schedules_owner_id_is_active_idx" ON "report_schedules"("owner_id", "is_active");
CREATE INDEX "report_schedules_deleted_at_idx" ON "report_schedules"("deleted_at");
CREATE INDEX "report_audits_user_id_created_at_idx" ON "report_audits"("user_id", "created_at");
CREATE INDEX "report_audits_category_idx" ON "report_audits"("category");

ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "report_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "report_audits" ADD CONSTRAINT "report_audits_saved_report_id_fkey" FOREIGN KEY ("saved_report_id") REFERENCES "saved_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "report_audits" ADD CONSTRAINT "report_audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
