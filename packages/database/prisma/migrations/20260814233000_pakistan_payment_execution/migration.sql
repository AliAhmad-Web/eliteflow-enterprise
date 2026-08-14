-- Phase 4: Pakistan payment execution (Bank Transfer, JazzCash, EasyPaisa).
-- Additive. Does not break Phase 1/2/3 customer requests, quotes, or invoices.

ALTER TYPE "invoice_payment_status" ADD VALUE 'PARTIALLY_PAID';

CREATE TYPE "pakistan_payment_method" AS ENUM ('BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA');
CREATE TYPE "payment_execution_status" AS ENUM ('INITIATED', 'PENDING', 'PENDING_VERIFICATION', 'VERIFIED', 'PAID', 'FAILED', 'EXPIRED', 'REJECTED', 'REFUNDED');
CREATE TYPE "payment_refund_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'FAILED');

ALTER TABLE "invoices" ADD COLUMN "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;

CREATE TABLE "payment_method_configs" (
    "method" "pakistan_payment_method" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "display_name" VARCHAR(80) NOT NULL,
    "instructions" TEXT,
    "bank_name" VARCHAR(120),
    "account_title" VARCHAR(200),
    "account_number" VARCHAR(64),
    "iban" VARCHAR(64),
    "merchant_public_id" VARCHAR(80),
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_method_configs_pkey" PRIMARY KEY ("method")
);

CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "payment_number" VARCHAR(40) NOT NULL,
    "invoice_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "project_id" UUID,
    "quote_id" UUID,
    "payment_schedule_item_id" UUID,
    "method" "pakistan_payment_method" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "payment_execution_status" NOT NULL DEFAULT 'INITIATED',
    "provider_txn_id" VARCHAR(120),
    "customer_reference" VARCHAR(120),
    "proof_file_id" UUID,
    "paid_at_customer" DATE,
    "notes" TEXT,
    "failure_reason" VARCHAR(500),
    "rejection_reason" VARCHAR(500),
    "verification_notes" TEXT,
    "provider_metadata" JSONB,
    "submitted_by_id" UUID,
    "verified_by_id" UUID,
    "submitted_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_refunds" (
    "id" UUID NOT NULL,
    "refund_number" VARCHAR(40) NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "payment_refund_status" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "requested_by_id" UUID,
    "authorized_by_id" UUID,
    "authorized_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_webhook_events" (
    "id" UUID NOT NULL,
    "provider" "pakistan_payment_method" NOT NULL,
    "event_key" VARCHAR(255) NOT NULL,
    "payment_id" UUID,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "reason" VARCHAR(200),
    "payload_hash" VARCHAR(128),
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_payment_number_key" ON "payments"("payment_number");
CREATE UNIQUE INDEX "payments_provider_txn_id_key" ON "payments"("provider_txn_id");
CREATE INDEX "payments_invoice_id_status_idx" ON "payments"("invoice_id", "status");
CREATE INDEX "payments_client_id_status_idx" ON "payments"("client_id", "status");
CREATE INDEX "payments_project_id_idx" ON "payments"("project_id");
CREATE INDEX "payments_quote_id_idx" ON "payments"("quote_id");
CREATE INDEX "payments_method_status_idx" ON "payments"("method", "status");
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");
CREATE INDEX "payments_submitted_by_id_idx" ON "payments"("submitted_by_id");
CREATE INDEX "payments_verified_by_id_idx" ON "payments"("verified_by_id");

CREATE UNIQUE INDEX "payment_refunds_refund_number_key" ON "payment_refunds"("refund_number");
CREATE INDEX "payment_refunds_payment_id_status_idx" ON "payment_refunds"("payment_id", "status");
CREATE INDEX "payment_refunds_status_created_at_idx" ON "payment_refunds"("status", "created_at");

CREATE UNIQUE INDEX "payment_webhook_events_event_key_key" ON "payment_webhook_events"("event_key");
CREATE INDEX "payment_webhook_events_provider_processed_at_idx" ON "payment_webhook_events"("provider", "processed_at");
CREATE INDEX "payment_webhook_events_payment_id_idx" ON "payment_webhook_events"("payment_id");

ALTER TABLE "payment_method_configs" ADD CONSTRAINT "payment_method_configs_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_schedule_item_id_fkey" FOREIGN KEY ("payment_schedule_item_id") REFERENCES "payment_schedule_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_proof_file_id_fkey" FOREIGN KEY ("proof_file_id") REFERENCES "managed_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_authorized_by_id_fkey" FOREIGN KEY ("authorized_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "payment_method_configs" ("method", "enabled", "display_name", "instructions", "updated_at")
VALUES
  ('BANK_TRANSFER', true, 'Bank Transfer', 'Transfer the exact invoice amount to the EliteFlow bank account and upload your receipt. Payment is confirmed after admin verification.', CURRENT_TIMESTAMP),
  ('JAZZCASH', true, 'JazzCash', 'Pay with JazzCash wallet or hosted checkout. Confirmation is verified by EliteFlow — a success screen is not enough.', CURRENT_TIMESTAMP),
  ('EASYPAISA', true, 'EasyPaisa', 'Pay with EasyPaisa wallet or hosted checkout. Confirmation is verified by EliteFlow — a success screen is not enough.', CURRENT_TIMESTAMP)
ON CONFLICT ("method") DO NOTHING;

INSERT INTO "permissions" ("id", "key", "resource", "action", "description", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'payments:read', 'payments', 'read', 'View payments, schedules, and verification status', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payments:pay', 'payments', 'pay', 'Initiate or submit a customer payment', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payments:verify', 'payments', 'verify', 'Verify or reject customer payments', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payments:configure', 'payments', 'configure', 'Enable payment methods and bank details', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payments:refund', 'payments', 'refund', 'Record and authorize payment refunds', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."code" IN ('SUPER_ADMIN', 'ADMIN')
  AND p."key" IN ('payments:read', 'payments:verify', 'payments:configure', 'payments:refund')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."code" = 'EMPLOYEE'
  AND p."key" = 'payments:read'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."code" = 'CLIENT'
  AND p."key" IN ('payments:read', 'payments:pay')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
