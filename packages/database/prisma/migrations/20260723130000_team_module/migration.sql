-- CreateEnum
CREATE TYPE "employee_status" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "attendance_status" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'REMOTE', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "leave_type" AS ENUM ('ANNUAL', 'SICK', 'PERSONAL', 'UNPAID', 'MATERNITY', 'PATERNITY', 'OTHER');

-- CreateEnum
CREATE TYPE "leave_request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "performance_rating" AS ENUM ('POOR', 'BELOW_AVERAGE', 'AVERAGE', 'GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "goal_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "description" VARCHAR(500),
    "head_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "employee_code" VARCHAR(40) NOT NULL,
    "department_id" UUID,
    "designation" VARCHAR(120),
    "manager_id" UUID,
    "status" "employee_status" NOT NULL DEFAULT 'ACTIVE',
    "hire_date" DATE,
    "phone" VARCHAR(40),
    "work_location" VARCHAR(120),
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience_years" DECIMAL(4,1),
    "bio" TEXT,
    "document_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emergency_contact_name" VARCHAR(120),
    "emergency_contact_phone" VARCHAR(40),
    "emergency_contact_relation" VARCHAR(80),
    "annual_leave_balance" INTEGER NOT NULL DEFAULT 20,
    "sick_leave_balance" INTEGER NOT NULL DEFAULT 10,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_teams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "department_id" UUID,
    "leader_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "hr_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_team_members" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_label" VARCHAR(80),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "check_in_at" TIMESTAMP(3),
    "check_out_at" TIMESTAMP(3),
    "status" "attendance_status" NOT NULL DEFAULT 'PRESENT',
    "working_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "type" "leave_type" NOT NULL,
    "status" "leave_request_status" NOT NULL DEFAULT 'PENDING',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" VARCHAR(1000),
    "review_note" VARCHAR(1000),
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "period_label" VARCHAR(40) NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "rating" "performance_rating" NOT NULL DEFAULT 'AVERAGE',
    "productivity_score" INTEGER NOT NULL DEFAULT 70,
    "kpi_summary" TEXT,
    "notes" TEXT,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_goals" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "kpi_metric" VARCHAR(120),
    "target_value" VARCHAR(80),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "goal_status" NOT NULL DEFAULT 'NOT_STARTED',
    "due_date" DATE,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "employee_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");
CREATE INDEX "departments_deleted_at_idx" ON "departments"("deleted_at");
CREATE INDEX "departments_name_idx" ON "departments"("name");

CREATE UNIQUE INDEX "employee_profiles_user_id_key" ON "employee_profiles"("user_id");
CREATE UNIQUE INDEX "employee_profiles_employee_code_key" ON "employee_profiles"("employee_code");
CREATE INDEX "employee_profiles_department_id_idx" ON "employee_profiles"("department_id");
CREATE INDEX "employee_profiles_manager_id_idx" ON "employee_profiles"("manager_id");
CREATE INDEX "employee_profiles_status_idx" ON "employee_profiles"("status");
CREATE INDEX "employee_profiles_deleted_at_idx" ON "employee_profiles"("deleted_at");

CREATE INDEX "hr_teams_department_id_idx" ON "hr_teams"("department_id");
CREATE INDEX "hr_teams_leader_id_idx" ON "hr_teams"("leader_id");
CREATE INDEX "hr_teams_deleted_at_idx" ON "hr_teams"("deleted_at");

CREATE UNIQUE INDEX "hr_team_members_team_id_user_id_key" ON "hr_team_members"("team_id", "user_id");
CREATE INDEX "hr_team_members_user_id_idx" ON "hr_team_members"("user_id");

CREATE UNIQUE INDEX "attendance_records_employee_id_date_key" ON "attendance_records"("employee_id", "date");
CREATE INDEX "attendance_records_date_idx" ON "attendance_records"("date");
CREATE INDEX "attendance_records_status_idx" ON "attendance_records"("status");
CREATE INDEX "attendance_records_deleted_at_idx" ON "attendance_records"("deleted_at");

CREATE INDEX "leave_requests_employee_id_status_idx" ON "leave_requests"("employee_id", "status");
CREATE INDEX "leave_requests_start_date_end_date_idx" ON "leave_requests"("start_date", "end_date");
CREATE INDEX "leave_requests_deleted_at_idx" ON "leave_requests"("deleted_at");

CREATE INDEX "performance_reviews_employee_id_idx" ON "performance_reviews"("employee_id");
CREATE INDEX "performance_reviews_period_start_period_end_idx" ON "performance_reviews"("period_start", "period_end");
CREATE INDEX "performance_reviews_deleted_at_idx" ON "performance_reviews"("deleted_at");

CREATE INDEX "employee_goals_employee_id_status_idx" ON "employee_goals"("employee_id", "status");
CREATE INDEX "employee_goals_deleted_at_idx" ON "employee_goals"("deleted_at");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_id_fkey" FOREIGN KEY ("head_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "hr_teams" ADD CONSTRAINT "hr_teams_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hr_teams" ADD CONSTRAINT "hr_teams_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hr_teams" ADD CONSTRAINT "hr_teams_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hr_teams" ADD CONSTRAINT "hr_teams_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "hr_team_members" ADD CONSTRAINT "hr_team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "hr_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hr_team_members" ADD CONSTRAINT "hr_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employee_goals" ADD CONSTRAINT "employee_goals_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_goals" ADD CONSTRAINT "employee_goals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_goals" ADD CONSTRAINT "employee_goals_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
