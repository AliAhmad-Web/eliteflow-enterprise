-- Persistent Enterprise AI Memory records (structured summaries only).
CREATE TABLE IF NOT EXISTS "ai_memory_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "conversation_id" UUID,
    "memory_key" VARCHAR(128) NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "scope" VARCHAR(32) NOT NULL,
    "priority" VARCHAR(16) NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "source" VARCHAR(64) NOT NULL,
    "tags_json" TEXT NOT NULL DEFAULT '[]',
    "permission_keys_json" TEXT NOT NULL DEFAULT '[]',
    "recency" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "expires_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_memory_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_memory_records_user_id_memory_key_key"
  ON "ai_memory_records"("user_id", "memory_key");

CREATE INDEX IF NOT EXISTS "ai_memory_records_user_id_deleted_at_type_idx"
  ON "ai_memory_records"("user_id", "deleted_at", "type");

CREATE INDEX IF NOT EXISTS "ai_memory_records_user_id_conversation_id_deleted_at_idx"
  ON "ai_memory_records"("user_id", "conversation_id", "deleted_at");

CREATE INDEX IF NOT EXISTS "ai_memory_records_expires_at_idx"
  ON "ai_memory_records"("expires_at");

CREATE INDEX IF NOT EXISTS "ai_memory_records_updated_at_idx"
  ON "ai_memory_records"("updated_at");

ALTER TABLE "ai_memory_records"
  ADD CONSTRAINT "ai_memory_records_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_memory_records"
  ADD CONSTRAINT "ai_memory_records_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
