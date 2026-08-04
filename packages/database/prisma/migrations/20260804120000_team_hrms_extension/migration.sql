-- CreateEnum
CREATE TYPE "employee_gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "employment_type" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY');

-- AlterTable
ALTER TABLE "employee_profiles"
  ADD COLUMN IF NOT EXISTS "admin_code" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "primary_team_id" UUID,
  ADD COLUMN IF NOT EXISTS "employment_type" "employment_type" NOT NULL DEFAULT 'FULL_TIME',
  ADD COLUMN IF NOT EXISTS "gender" "employee_gender",
  ADD COLUMN IF NOT EXISTS "date_of_birth" DATE,
  ADD COLUMN IF NOT EXISTS "national_id" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "address" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "salary" DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "photo_url" VARCHAR(2048);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "employee_profiles_admin_code_key" ON "employee_profiles"("admin_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "employee_profiles_primary_team_id_idx" ON "employee_profiles"("primary_team_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_profiles_primary_team_id_fkey'
  ) THEN
    ALTER TABLE "employee_profiles"
      ADD CONSTRAINT "employee_profiles_primary_team_id_fkey"
      FOREIGN KEY ("primary_team_id") REFERENCES "hr_teams"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
