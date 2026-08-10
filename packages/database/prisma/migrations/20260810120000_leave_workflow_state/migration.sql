-- Durable leave multi-stage approval workflow (PostgreSQL source of truth)

CREATE TYPE "leave_workflow_stage_state" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'MANAGER_APPROVED',
  'MANAGER_REJECTED',
  'HR_APPROVED',
  'HR_REJECTED',
  'FINAL_APPROVED',
  'FINAL_REJECTED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TABLE "leave_workflow_states" (
  "id" UUID NOT NULL,
  "leave_request_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "subject_user_id" UUID NOT NULL,
  "state" "leave_workflow_stage_state" NOT NULL,
  "stage_status" VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  "manager_approver_id" UUID,
  "manager_approved_at" TIMESTAMP(3),
  "hr_approver_id" UUID,
  "hr_approved_at" TIMESTAMP(3),
  "final_approver_id" UUID,
  "final_approved_at" TIMESTAMP(3),
  "override_by_id" UUID,
  "override_at" TIMESTAMP(3),
  "override_action" VARCHAR(20),
  "submitted_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "leave_workflow_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "leave_workflow_states_leave_request_id_key" ON "leave_workflow_states"("leave_request_id");
CREATE INDEX "leave_workflow_states_state_expires_at_idx" ON "leave_workflow_states"("state", "expires_at");
CREATE INDEX "leave_workflow_states_employee_id_idx" ON "leave_workflow_states"("employee_id");
CREATE INDEX "leave_workflow_states_expires_at_idx" ON "leave_workflow_states"("expires_at");

ALTER TABLE "leave_workflow_states"
  ADD CONSTRAINT "leave_workflow_states_leave_request_id_fkey"
  FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
