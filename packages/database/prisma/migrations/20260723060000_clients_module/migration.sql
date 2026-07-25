-- CreateEnum
CREATE TYPE "client_status" AS ENUM ('LEAD', 'ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "contact_name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(40),
    "website" VARCHAR(2048),
    "address_line1" VARCHAR(255),
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "status" "client_status" NOT NULL DEFAULT 'LEAD',
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_company_name_idx" ON "clients"("company_name");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "clients_deleted_at_idx" ON "clients"("deleted_at");

-- CreateIndex
CREATE INDEX "clients_created_by_id_idx" ON "clients"("created_by_id");

-- CreateIndex
CREATE INDEX "clients_created_at_idx" ON "clients"("created_at");

-- Partial unique: one active (non-deleted) client per email
CREATE UNIQUE INDEX "clients_email_active_key" ON "clients"("email") WHERE "deleted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
