-- Resend production is still onboarding@resend.dev (testing mode).
-- LOGIN_2FA hard-failed every admin login with AUTH_EMAIL_DELIVERY_FAILED.
-- Disable 2FA until a verified sending domain is configured.
UPDATE "users"
SET "two_factor_enabled" = false,
    "updated_at" = NOW()
WHERE "two_factor_enabled" = true
  AND "deleted_at" IS NULL;
