-- Phase 3: Quote / estimate foundation, payment schedules, invoice commercial/payment split.
-- Additive and backward-compatible with existing invoices and customer requests.

CREATE TYPE "invoice_payment_status" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');
CREATE TYPE "invoice_kind" AS ENUM ('STANDARD', 'ADVANCE', 'MILESTONE', 'FINAL');
CREATE TYPE "quote_status" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "payment_model" AS ENUM ('UPFRONT_100', 'SPLIT_50_50', 'SPLIT_30_70', 'MILESTONE', 'CUSTOM');
CREATE TYPE "payment_schedule_kind" AS ENUM ('ADVANCE', 'MILESTONE', 'FINAL', 'CUSTOM');

CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "quote_number" VARCHAR(40) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "client_id" UUID NOT NULL,
    "customer_request_id" UUID,
    "project_id" UUID NOT NULL,
    "status" "quote_status" NOT NULL DEFAULT 'DRAFT',
    "payment_model" "payment_model" NOT NULL DEFAULT 'UPFRONT_100',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "sent_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by_id" UUID,
    "rejected_at" TIMESTAMP(3),
    "rejected_by_id" UUID,
    "rejection_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_items" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "line_total" DECIMAL(14,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_schedule_items" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "kind" "payment_schedule_kind" NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "due_date" DATE,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_schedule_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quotes_quote_number_key" ON "quotes"("quote_number");
CREATE INDEX "quotes_client_id_status_idx" ON "quotes"("client_id", "status");
CREATE INDEX "quotes_project_id_idx" ON "quotes"("project_id");
CREATE INDEX "quotes_customer_request_id_idx" ON "quotes"("customer_request_id");
CREATE INDEX "quotes_status_idx" ON "quotes"("status");
CREATE INDEX "quotes_deleted_at_idx" ON "quotes"("deleted_at");
CREATE INDEX "quotes_created_by_id_idx" ON "quotes"("created_by_id");
CREATE INDEX "quotes_created_at_idx" ON "quotes"("created_at");
CREATE INDEX "quotes_expiry_date_idx" ON "quotes"("expiry_date");
CREATE INDEX "quote_items_quote_id_sort_order_idx" ON "quote_items"("quote_id", "sort_order");
CREATE INDEX "payment_schedule_items_quote_id_sort_order_idx" ON "payment_schedule_items"("quote_id", "sort_order");

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_request_id_fkey" FOREIGN KEY ("customer_request_id") REFERENCES "customer_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_schedule_items" ADD CONSTRAINT "payment_schedule_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "quote_id" UUID;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payment_schedule_item_id" UUID;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoice_kind" "invoice_kind" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payment_status" "invoice_payment_status" NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "issued_at" TIMESTAMP(3);

UPDATE "invoices"
SET "payment_status" = 'PAID'
WHERE "status" = 'PAID' AND "payment_status" = 'UNPAID';

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_payment_schedule_item_id_key" ON "invoices"("payment_schedule_item_id");
CREATE INDEX IF NOT EXISTS "invoices_payment_status_idx" ON "invoices"("payment_status");
CREATE INDEX IF NOT EXISTS "invoices_invoice_kind_idx" ON "invoices"("invoice_kind");
CREATE INDEX IF NOT EXISTS "invoices_quote_id_idx" ON "invoices"("quote_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_quote_id_fkey'
  ) THEN
    ALTER TABLE "invoices"
      ADD CONSTRAINT "invoices_quote_id_fkey"
      FOREIGN KEY ("quote_id") REFERENCES "quotes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_payment_schedule_item_id_fkey'
  ) THEN
    ALTER TABLE "invoices"
      ADD CONSTRAINT "invoices_payment_schedule_item_id_fkey"
      FOREIGN KEY ("payment_schedule_item_id") REFERENCES "payment_schedule_items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "permissions" ("id", "key", "resource", "action", "description", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'quotes:read', 'quotes', 'read', 'View quotes, payment schedules, and commercial status', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'quotes:write', 'quotes', 'write', 'Create and update quotes and payment schedules', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'quotes:send', 'quotes', 'send', 'Send quotes to customers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'quotes:approve', 'quotes', 'approve', 'Approve or reject quotes assigned to the customer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."code" IN ('SUPER_ADMIN', 'ADMIN')
  AND p."key" IN ('quotes:read', 'quotes:write', 'quotes:send')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."code" = 'EMPLOYEE'
  AND p."key" = 'quotes:read'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."code" = 'CLIENT'
  AND p."key" IN ('quotes:read', 'quotes:approve')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
