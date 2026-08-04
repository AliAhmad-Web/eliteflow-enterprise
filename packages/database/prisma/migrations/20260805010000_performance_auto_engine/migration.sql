-- Automated Performance Management: scoring config, snapshots, insights, monthly reports

CREATE TYPE "performance_score_source" AS ENUM ('MANUAL', 'AUTO', 'HYBRID');
CREATE TYPE "performance_monthly_report_status" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ADJUSTED');

ALTER TABLE "performance_reviews"
  ADD COLUMN IF NOT EXISTS "auto_score" INTEGER,
  ADD COLUMN IF NOT EXISTS "source" "performance_score_source" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "component_scores" JSONB,
  ADD COLUMN IF NOT EXISTS "insights" JSONB,
  ADD COLUMN IF NOT EXISTS "manager_adjustment" INTEGER,
  ADD COLUMN IF NOT EXISTS "manager_comment" TEXT;

CREATE INDEX IF NOT EXISTS "performance_reviews_source_idx" ON "performance_reviews"("source");

ALTER TABLE "employee_goals"
  ADD COLUMN IF NOT EXISTS "linked_task_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "auto_progress" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "performance_scoring_configs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" VARCHAR(40) NOT NULL DEFAULT 'default',
  "weights" JSONB NOT NULL,
  "enabled_metrics" JSONB NOT NULL,
  "min_score_threshold" INTEGER NOT NULL DEFAULT 50,
  "alert_threshold" INTEGER NOT NULL DEFAULT 45,
  "promotion_min_score" INTEGER NOT NULL DEFAULT 85,
  "bonus_min_score" INTEGER NOT NULL DEFAULT 80,
  "lookback_days" INTEGER NOT NULL DEFAULT 30,
  "updated_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "performance_scoring_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "performance_scoring_configs_key_key" ON "performance_scoring_configs"("key");

ALTER TABLE "performance_scoring_configs"
  ADD CONSTRAINT "performance_scoring_configs_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "performance_score_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "overall_score" INTEGER NOT NULL,
  "component_scores" JSONB NOT NULL,
  "derived_rating" "performance_rating" NOT NULL,
  "insights" JSONB NOT NULL DEFAULT '[]',
  "trend_delta" INTEGER NOT NULL DEFAULT 0,
  "source" "performance_score_source" NOT NULL DEFAULT 'AUTO',
  "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "performance_score_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "performance_score_snapshots_employee_id_period_start_period_end_key"
  ON "performance_score_snapshots"("employee_id", "period_start", "period_end");
CREATE INDEX IF NOT EXISTS "performance_score_snapshots_overall_score_idx" ON "performance_score_snapshots"("overall_score");
CREATE INDEX IF NOT EXISTS "performance_score_snapshots_computed_at_idx" ON "performance_score_snapshots"("computed_at");

ALTER TABLE "performance_score_snapshots"
  ADD CONSTRAINT "performance_score_snapshots_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "performance_insights" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "severity" VARCHAR(20) NOT NULL,
  "category" VARCHAR(40) NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "metric_key" VARCHAR(60),
  "acknowledged" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  CONSTRAINT "performance_insights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "performance_insights_employee_id_created_at_idx" ON "performance_insights"("employee_id", "created_at");
CREATE INDEX IF NOT EXISTS "performance_insights_acknowledged_idx" ON "performance_insights"("acknowledged");

ALTER TABLE "performance_insights"
  ADD CONSTRAINT "performance_insights_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "performance_monthly_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "overall_score" INTEGER NOT NULL,
  "summary" TEXT NOT NULL,
  "strengths" JSONB NOT NULL DEFAULT '[]',
  "weaknesses" JSONB NOT NULL DEFAULT '[]',
  "improvements" JSONB NOT NULL DEFAULT '[]',
  "ai_recommendations" JSONB NOT NULL DEFAULT '[]',
  "promotion_ready" BOOLEAN NOT NULL DEFAULT false,
  "salary_review_suggested" BOOLEAN NOT NULL DEFAULT false,
  "status" "performance_monthly_report_status" NOT NULL DEFAULT 'DRAFT',
  "manager_notes" TEXT,
  "approved_by_id" UUID,
  "approved_at" TIMESTAMP(3),
  "component_scores" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "performance_monthly_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "performance_monthly_reports_employee_id_year_month_key"
  ON "performance_monthly_reports"("employee_id", "year", "month");
CREATE INDEX IF NOT EXISTS "performance_monthly_reports_year_month_idx" ON "performance_monthly_reports"("year", "month");
CREATE INDEX IF NOT EXISTS "performance_monthly_reports_status_idx" ON "performance_monthly_reports"("status");

ALTER TABLE "performance_monthly_reports"
  ADD CONSTRAINT "performance_monthly_reports_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "performance_monthly_reports"
  ADD CONSTRAINT "performance_monthly_reports_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default scoring config
INSERT INTO "performance_scoring_configs" (
  "id", "key", "weights", "enabled_metrics", "min_score_threshold", "alert_threshold",
  "promotion_min_score", "bonus_min_score", "lookback_days", "created_at", "updated_at"
)
VALUES (
  gen_random_uuid(),
  'default',
  '{"attendance":15,"taskCompletion":25,"deadlinePerformance":15,"productivity":15,"projectContribution":10,"teamCollaboration":10,"discipline":5,"learning":5}'::jsonb,
  '{"attendance":true,"taskCompletion":true,"deadlinePerformance":true,"productivity":true,"projectContribution":true,"teamCollaboration":true,"discipline":true,"learning":true,"leave":true,"aiUsage":true,"meetings":true,"activity":true}'::jsonb,
  50, 45, 85, 80, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
