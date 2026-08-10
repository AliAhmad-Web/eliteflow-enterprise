-- Public API v1 inbound API keys (hashed secrets only)

CREATE TABLE IF NOT EXISTS "public_api_keys" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "key_prefix" VARCHAR(32) NOT NULL,
  "key_hash" VARCHAR(255) NOT NULL,
  "scopes" VARCHAR(64)[] NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "client_id" UUID,
  "last_used_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "public_api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "public_api_keys_key_prefix_key"
  ON "public_api_keys"("key_prefix");

CREATE INDEX IF NOT EXISTS "public_api_keys_owner_user_id_created_at_idx"
  ON "public_api_keys"("owner_user_id", "created_at");

CREATE INDEX IF NOT EXISTS "public_api_keys_client_id_idx"
  ON "public_api_keys"("client_id");

CREATE INDEX IF NOT EXISTS "public_api_keys_revoked_at_idx"
  ON "public_api_keys"("revoked_at");

CREATE INDEX IF NOT EXISTS "public_api_keys_expires_at_idx"
  ON "public_api_keys"("expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'public_api_keys_owner_user_id_fkey'
  ) THEN
    ALTER TABLE "public_api_keys"
      ADD CONSTRAINT "public_api_keys_owner_user_id_fkey"
      FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'public_api_keys_client_id_fkey'
  ) THEN
    ALTER TABLE "public_api_keys"
      ADD CONSTRAINT "public_api_keys_client_id_fkey"
      FOREIGN KEY ("client_id") REFERENCES "clients"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
