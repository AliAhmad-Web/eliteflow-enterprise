-- Ensure one OAuth provider link per application user (one email = one account).
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_user_id_provider_key"
ON "oauth_accounts"("user_id", "provider");
