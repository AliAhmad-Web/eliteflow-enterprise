-- Phase 19.2: OAuth token retry fields on sync_history

ALTER TABLE "sync_history" ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "sync_history" ADD COLUMN "failure_reason" VARCHAR(500);
ALTER TABLE "sync_history" ADD COLUMN "last_retry_at" TIMESTAMP(3);
