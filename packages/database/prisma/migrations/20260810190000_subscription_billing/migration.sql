-- Subscription & Billing commercial core
-- Extends organization_billing for Stripe; adds plan catalog, events, webhook ledger.

ALTER TABLE "organization_billing"
  ADD COLUMN IF NOT EXISTS "plan_id" UUID,
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "stripe_price_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_billing_stripe_customer_id_key"
  ON "organization_billing"("stripe_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "organization_billing_stripe_subscription_id_key"
  ON "organization_billing"("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "organization_billing_status_idx"
  ON "organization_billing"("status");
CREATE INDEX IF NOT EXISTS "organization_billing_plan_id_idx"
  ON "organization_billing"("plan_id");

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" VARCHAR(500),
  "stripe_product_id" VARCHAR(255),
  "stripe_price_id" VARCHAR(255),
  "amount_cents" INTEGER NOT NULL DEFAULT 0,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'usd',
  "interval" VARCHAR(20) NOT NULL DEFAULT 'month',
  "seats_included" INTEGER NOT NULL DEFAULT 10,
  "storage_quota_bytes" BIGINT NOT NULL DEFAULT 5368709120,
  "ai_credits_included" INTEGER NOT NULL DEFAULT 1000,
  "features_json" JSONB,
  "trial_days" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key" ON "subscription_plans"("code");
CREATE INDEX IF NOT EXISTS "subscription_plans_is_active_sort_order_idx"
  ON "subscription_plans"("is_active", "sort_order");

CREATE TABLE IF NOT EXISTS "subscription_events" (
  "id" UUID NOT NULL,
  "organization_billing_id" UUID NOT NULL,
  "event_type" VARCHAR(80) NOT NULL,
  "from_status" VARCHAR(40),
  "to_status" VARCHAR(40),
  "stripe_event_id" VARCHAR(255),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_events_stripe_event_id_key"
  ON "subscription_events"("stripe_event_id");
CREATE INDEX IF NOT EXISTS "subscription_events_organization_billing_id_created_at_idx"
  ON "subscription_events"("organization_billing_id", "created_at");

CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
  "id" VARCHAR(255) NOT NULL,
  "type" VARCHAR(120) NOT NULL,
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload_hash" VARCHAR(128),
  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stripe_webhook_events_type_processed_at_idx"
  ON "stripe_webhook_events"("type", "processed_at");

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "stripe_invoice_id" VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_stripe_invoice_id_key"
  ON "invoices"("stripe_invoice_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_billing_plan_id_fkey'
  ) THEN
    ALTER TABLE "organization_billing"
      ADD CONSTRAINT "organization_billing_plan_id_fkey"
      FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_events_organization_billing_id_fkey'
  ) THEN
    ALTER TABLE "subscription_events"
      ADD CONSTRAINT "subscription_events_organization_billing_id_fkey"
      FOREIGN KEY ("organization_billing_id") REFERENCES "organization_billing"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Seed default SaaS plans (Stripe price IDs filled from env at runtime if present)
INSERT INTO "subscription_plans" (
  "id", "code", "name", "description", "amount_cents", "currency", "interval",
  "seats_included", "storage_quota_bytes", "ai_credits_included", "features_json",
  "trial_days", "is_active", "sort_order", "created_at", "updated_at"
)
VALUES
  (
    'a1000000-0000-4000-8000-000000000001',
    'starter',
    'Starter',
    'Core workspace for small teams',
    2900,
    'usd',
    'month',
    10,
    5368709120,
    1000,
    '["Projects","Tasks","Invoices","Client Portal"]'::jsonb,
    14,
    true,
    10,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'professional',
    'Professional',
    'Growing teams with CRM and automation',
    7900,
    'usd',
    'month',
    50,
    53687091200,
    10000,
    '["Everything in Starter","CRM Pipeline","Advanced Reports","Priority Support"]'::jsonb,
    14,
    true,
    20,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'enterprise',
    'Enterprise',
    'Security, scale, and dedicated support',
    19900,
    'usd',
    'month',
    250,
    536870912000,
    100000,
    '["Everything in Professional","SSO","Audit exports","Dedicated CSM"]'::jsonb,
    0,
    true,
    30,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("code") DO NOTHING;
