-- Channel archive support (extends conversations; no new entity)

ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "conversations_archived_at_idx" ON "conversations"("archived_at");