-- Enterprise 360° AI Performance Engine extensions

CREATE TYPE "performance_report_period" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL');

ALTER TABLE "performance_score_snapshots"
  ADD COLUMN IF NOT EXISTS "score_breakdown" JSONB,
  ADD COLUMN IF NOT EXISTS "metrics" JSONB,
  ADD COLUMN IF NOT EXISTS "predictions" JSONB,
  ADD COLUMN IF NOT EXISTS "recommendations" JSONB,
  ADD COLUMN IF NOT EXISTS "department_rank" INTEGER,
  ADD COLUMN IF NOT EXISTS "organization_rank" INTEGER;

CREATE INDEX IF NOT EXISTS "performance_score_snapshots_organization_rank_idx"
  ON "performance_score_snapshots"("organization_rank");

CREATE TABLE IF NOT EXISTS "performance_period_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "period_type" "performance_report_period" NOT NULL,
  "period_key" VARCHAR(20) NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "overall_score" INTEGER NOT NULL,
  "score_breakdown" JSONB NOT NULL,
  "metrics" JSONB NOT NULL DEFAULT '{}',
  "predictions" JSONB NOT NULL DEFAULT '{}',
  "summary" TEXT NOT NULL,
  "strengths" JSONB NOT NULL DEFAULT '[]',
  "weaknesses" JSONB NOT NULL DEFAULT '[]',
  "improvements" JSONB NOT NULL DEFAULT '[]',
  "ai_recommendations" JSONB NOT NULL DEFAULT '[]',
  "training_suggestions" JSONB NOT NULL DEFAULT '[]',
  "promotion_ready" BOOLEAN NOT NULL DEFAULT false,
  "salary_review_suggested" BOOLEAN NOT NULL DEFAULT false,
  "bonus_suggested" BOOLEAN NOT NULL DEFAULT false,
  "burnout_risk" INTEGER NOT NULL DEFAULT 0,
  "attrition_risk" INTEGER NOT NULL DEFAULT 0,
  "status" "performance_monthly_report_status" NOT NULL DEFAULT 'DRAFT',
  "manager_notes" TEXT,
  "approved_by_id" UUID,
  "approved_at" TIMESTAMP(3),
  "component_scores" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "performance_period_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "performance_period_reports_employee_id_period_type_period_key_key"
  ON "performance_period_reports"("employee_id", "period_type", "period_key");
CREATE INDEX IF NOT EXISTS "performance_period_reports_period_type_period_key_idx"
  ON "performance_period_reports"("period_type", "period_key");
CREATE INDEX IF NOT EXISTS "performance_period_reports_status_idx"
  ON "performance_period_reports"("status");
CREATE INDEX IF NOT EXISTS "performance_period_reports_attrition_risk_idx"
  ON "performance_period_reports"("attrition_risk");

ALTER TABLE "performance_period_reports"
  ADD CONSTRAINT "performance_period_reports_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "performance_period_reports"
  ADD CONSTRAINT "performance_period_reports_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
