-- Restore composite index for idle session cleanup queries
-- (revokedAt IS NULL AND lastActiveAt < ?).

CREATE INDEX IF NOT EXISTS "sessions_revoked_at_last_active_at_idx"
ON "sessions" ("revoked_at", "last_active_at");
