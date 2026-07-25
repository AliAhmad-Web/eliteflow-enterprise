-- CreateEnum
CREATE TYPE "calendar_event_type" AS ENUM ('MEETING', 'EVENT', 'PROJECT_DEADLINE', 'TASK_DUE', 'REMINDER', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "calendar_event_status" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "calendar_event_category" AS ENUM ('WORK', 'PERSONAL', 'CLIENT', 'PROJECT', 'TEAM', 'HOLIDAY', 'OTHER');

-- CreateEnum
CREATE TYPE "event_attendee_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- CreateEnum
CREATE TYPE "reminder_channel" AS ENUM ('EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "recurrence_frequency" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "location" VARCHAR(255),
    "type" "calendar_event_type" NOT NULL DEFAULT 'EVENT',
    "status" "calendar_event_status" NOT NULL DEFAULT 'SCHEDULED',
    "category" "calendar_event_category" NOT NULL DEFAULT 'WORK',
    "color" VARCHAR(20) NOT NULL DEFAULT '#2563eb',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_frequency" "recurrence_frequency" NOT NULL DEFAULT 'NONE',
    "recurrence_interval" INTEGER NOT NULL DEFAULT 1,
    "recurrence_until" TIMESTAMP(3),
    "recurrence_count" INTEGER,
    "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "project_id" UUID,
    "task_id" UUID,
    "client_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "event_attendee_status" NOT NULL DEFAULT 'PENDING',
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_reminders" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "channel" "reminder_channel" NOT NULL DEFAULT 'IN_APP',
    "minutes_before" INTEGER NOT NULL,
    "created_by_id" UUID,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "date" DATE NOT NULL,
    "description" VARCHAR(500),
    "is_company_wide" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_events_starts_at_ends_at_idx" ON "calendar_events"("starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "calendar_events_deleted_at_idx" ON "calendar_events"("deleted_at");

-- CreateIndex
CREATE INDEX "calendar_events_created_by_id_idx" ON "calendar_events"("created_by_id");

-- CreateIndex
CREATE INDEX "calendar_events_project_id_idx" ON "calendar_events"("project_id");

-- CreateIndex
CREATE INDEX "calendar_events_task_id_idx" ON "calendar_events"("task_id");

-- CreateIndex
CREATE INDEX "calendar_events_client_id_idx" ON "calendar_events"("client_id");

-- CreateIndex
CREATE INDEX "calendar_events_type_idx" ON "calendar_events"("type");

-- CreateIndex
CREATE INDEX "calendar_events_status_idx" ON "calendar_events"("status");

-- CreateIndex
CREATE INDEX "calendar_events_category_idx" ON "calendar_events"("category");

-- CreateIndex
CREATE INDEX "event_attendees_user_id_status_idx" ON "event_attendees"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendees_event_id_user_id_key" ON "event_attendees"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "event_reminders_event_id_idx" ON "event_reminders"("event_id");

-- CreateIndex
CREATE INDEX "event_reminders_sent_at_idx" ON "event_reminders"("sent_at");

-- CreateIndex
CREATE INDEX "holidays_date_idx" ON "holidays"("date");

-- CreateIndex
CREATE INDEX "holidays_deleted_at_idx" ON "holidays"("deleted_at");

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
