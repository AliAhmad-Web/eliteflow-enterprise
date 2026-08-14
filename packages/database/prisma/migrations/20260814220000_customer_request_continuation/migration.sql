-- Phase 2: project continuation / change request types, parent linkage,
-- and CUSTOMER_RESPONDED status. Additive and backward-compatible.

ALTER TYPE "customer_request_type" ADD VALUE IF NOT EXISTS 'REVISION';
ALTER TYPE "customer_request_type" ADD VALUE IF NOT EXISTS 'ADDITIONAL_SCOPE';
ALTER TYPE "customer_request_type" ADD VALUE IF NOT EXISTS 'REOPEN_PROJECT';
ALTER TYPE "customer_request_type" ADD VALUE IF NOT EXISTS 'NEXT_PHASE';
ALTER TYPE "customer_request_type" ADD VALUE IF NOT EXISTS 'MAINTENANCE';

ALTER TYPE "customer_request_status" ADD VALUE IF NOT EXISTS 'CUSTOMER_RESPONDED';

ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "parent_request_id" UUID;

CREATE INDEX IF NOT EXISTS "customer_requests_target_project_id_idx"
  ON "customer_requests"("target_project_id");

CREATE INDEX IF NOT EXISTS "customer_requests_parent_request_id_idx"
  ON "customer_requests"("parent_request_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_requests_parent_request_id_fkey'
  ) THEN
    ALTER TABLE "customer_requests"
      ADD CONSTRAINT "customer_requests_parent_request_id_fkey"
      FOREIGN KEY ("parent_request_id")
      REFERENCES "customer_requests"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
