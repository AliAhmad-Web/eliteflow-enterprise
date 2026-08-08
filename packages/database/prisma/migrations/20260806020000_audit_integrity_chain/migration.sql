-- Phase 3 Step 8 — Enterprise Audit Integrity (tamper-evident hash chain)
ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "event_hash" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "previous_hash" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "hash_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "timestamp_integrity" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "audit_logs_created_at_id_idx"
  ON "audit_logs"("created_at", "id");
