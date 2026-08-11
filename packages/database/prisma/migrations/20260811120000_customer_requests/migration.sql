-- CreateEnum
CREATE TYPE "customer_request_type" AS ENUM ('NEW_PROJECT', 'NEW_TASK', 'GENERAL_SERVICE');

-- CreateEnum
CREATE TYPE "customer_request_status" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "customer_request_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "customer_requests" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "type" "customer_request_type" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "requirements" TEXT,
    "preferred_deadline" DATE,
    "expected_budget" DECIMAL(14,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "priority" "customer_request_priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "customer_request_status" NOT NULL DEFAULT 'DRAFT',
    "additional_notes" TEXT,
    "staff_notes" TEXT,
    "clarification_message" TEXT,
    "rejection_reason" TEXT,
    "target_project_id" UUID,
    "converted_project_id" UUID,
    "converted_task_id" UUID,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_request_attachments" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(2048) NOT NULL,
    "mime_type" VARCHAR(120),
    "size_bytes" INTEGER,
    "managed_file_id" UUID,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_requests_client_id_status_idx" ON "customer_requests"("client_id", "status");

-- CreateIndex
CREATE INDEX "customer_requests_created_by_id_idx" ON "customer_requests"("created_by_id");

-- CreateIndex
CREATE INDEX "customer_requests_converted_project_id_idx" ON "customer_requests"("converted_project_id");

-- CreateIndex
CREATE INDEX "customer_requests_converted_task_id_idx" ON "customer_requests"("converted_task_id");

-- CreateIndex
CREATE INDEX "customer_requests_status_idx" ON "customer_requests"("status");

-- CreateIndex
CREATE INDEX "customer_requests_type_idx" ON "customer_requests"("type");

-- CreateIndex
CREATE INDEX "customer_requests_deleted_at_idx" ON "customer_requests"("deleted_at");

-- CreateIndex
CREATE INDEX "customer_requests_created_at_idx" ON "customer_requests"("created_at");

-- CreateIndex
CREATE INDEX "customer_request_attachments_request_id_idx" ON "customer_request_attachments"("request_id");

-- CreateIndex
CREATE INDEX "customer_request_attachments_managed_file_id_idx" ON "customer_request_attachments"("managed_file_id");

-- CreateIndex
CREATE INDEX "customer_request_attachments_uploaded_by_id_idx" ON "customer_request_attachments"("uploaded_by_id");

-- AddForeignKey
ALTER TABLE "customer_requests" ADD CONSTRAINT "customer_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_requests" ADD CONSTRAINT "customer_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_requests" ADD CONSTRAINT "customer_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_requests" ADD CONSTRAINT "customer_requests_target_project_id_fkey" FOREIGN KEY ("target_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_requests" ADD CONSTRAINT "customer_requests_converted_project_id_fkey" FOREIGN KEY ("converted_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_requests" ADD CONSTRAINT "customer_requests_converted_task_id_fkey" FOREIGN KEY ("converted_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_request_attachments" ADD CONSTRAINT "customer_request_attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "customer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_request_attachments" ADD CONSTRAINT "customer_request_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
