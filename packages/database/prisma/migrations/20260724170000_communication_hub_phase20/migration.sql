-- Phase 20 — Enterprise Communication Hub
-- Extends Phase 16 chat with announcements, discussion threads, meeting architecture,
-- voice-note metadata, and organization channels. No WebRTC media plane.

-- Enum extensions
ALTER TYPE "conversation_type" ADD VALUE IF NOT EXISTS 'ORGANIZATION';
ALTER TYPE "message_kind" ADD VALUE IF NOT EXISTS 'VOICE';
ALTER TYPE "activity_entity_type" ADD VALUE IF NOT EXISTS 'ANNOUNCEMENT';
ALTER TYPE "activity_entity_type" ADD VALUE IF NOT EXISTS 'MEETING';
ALTER TYPE "activity_entity_type" ADD VALUE IF NOT EXISTS 'THREAD';

CREATE TYPE "announcement_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "meeting_status" AS ENUM ('SCHEDULED', 'WAITING', 'LIVE', 'ENDED', 'CANCELLED');
CREATE TYPE "meeting_participant_status" AS ENUM ('INVITED', 'WAITING', 'ADMITTED', 'JOINED', 'LEFT', 'DECLINED');
CREATE TYPE "discussion_thread_status" AS ENUM ('OPEN', 'RESOLVED', 'ARCHIVED');

-- Voice-note architecture columns on message attachments
ALTER TABLE "message_attachments"
  ADD COLUMN IF NOT EXISTS "duration_seconds" INTEGER,
  ADD COLUMN IF NOT EXISTS "waveform_json" TEXT;

-- Announcements
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "body" TEXT NOT NULL,
    "priority" "announcement_priority" NOT NULL DEFAULT 'NORMAL',
    "department_id" UUID,
    "expires_at" TIMESTAMP(3),
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "announcement_attachments" (
    "id" UUID NOT NULL,
    "announcement_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(2048) NOT NULL,
    "mime_type" VARCHAR(120),
    "size_bytes" INTEGER,
    "managed_file_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "announcement_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "announcement_reads" (
    "id" UUID NOT NULL,
    "announcement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcement_reads_pkey" PRIMARY KEY ("id")
);

-- Discussion threads
CREATE TABLE "discussion_threads" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "body" TEXT NOT NULL,
    "category" VARCHAR(100),
    "status" "discussion_thread_status" NOT NULL DEFAULT 'OPEN',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "department_id" UUID,
    "team_id" UUID,
    "project_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "discussion_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "discussion_replies" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "parent_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "discussion_replies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "discussion_thread_tags" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "tag" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "discussion_thread_tags_pkey" PRIMARY KEY ("id")
);

-- Meeting rooms (architecture only — no WebRTC)
CREATE TABLE "meeting_rooms" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" VARCHAR(2000),
    "status" "meeting_status" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_start" TIMESTAMP(3) NOT NULL,
    "scheduled_end" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "waiting_room_enabled" BOOLEAN NOT NULL DEFAULT true,
    "webrtc_room_id" VARCHAR(200),
    "conversation_id" UUID,
    "host_id" UUID NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "meeting_rooms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meeting_participants" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "meeting_participant_status" NOT NULL DEFAULT 'INVITED',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "admitted_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meeting_recordings" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "storage_url" VARCHAR(2048),
    "mime_type" VARCHAR(120),
    "size_bytes" INTEGER,
    "duration_seconds" INTEGER,
    "managed_file_id" UUID,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "meeting_recordings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meeting_screen_shares" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "meeting_screen_shares_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "announcements_priority_idx" ON "announcements"("priority");
CREATE INDEX "announcements_department_id_idx" ON "announcements"("department_id");
CREATE INDEX "announcements_expires_at_idx" ON "announcements"("expires_at");
CREATE INDEX "announcements_is_pinned_idx" ON "announcements"("is_pinned");
CREATE INDEX "announcements_published_at_idx" ON "announcements"("published_at");
CREATE INDEX "announcements_deleted_at_idx" ON "announcements"("deleted_at");
CREATE INDEX "announcements_created_by_id_idx" ON "announcements"("created_by_id");

CREATE INDEX "announcement_attachments_announcement_id_idx" ON "announcement_attachments"("announcement_id");
CREATE INDEX "announcement_attachments_managed_file_id_idx" ON "announcement_attachments"("managed_file_id");
CREATE INDEX "announcement_attachments_deleted_at_idx" ON "announcement_attachments"("deleted_at");

CREATE UNIQUE INDEX "announcement_reads_announcement_id_user_id_key" ON "announcement_reads"("announcement_id", "user_id");
CREATE INDEX "announcement_reads_user_id_idx" ON "announcement_reads"("user_id");
CREATE INDEX "announcement_reads_announcement_id_idx" ON "announcement_reads"("announcement_id");

CREATE INDEX "discussion_threads_status_idx" ON "discussion_threads"("status");
CREATE INDEX "discussion_threads_category_idx" ON "discussion_threads"("category");
CREATE INDEX "discussion_threads_is_pinned_idx" ON "discussion_threads"("is_pinned");
CREATE INDEX "discussion_threads_department_id_idx" ON "discussion_threads"("department_id");
CREATE INDEX "discussion_threads_team_id_idx" ON "discussion_threads"("team_id");
CREATE INDEX "discussion_threads_project_id_idx" ON "discussion_threads"("project_id");
CREATE INDEX "discussion_threads_deleted_at_idx" ON "discussion_threads"("deleted_at");
CREATE INDEX "discussion_threads_created_by_id_idx" ON "discussion_threads"("created_by_id");

CREATE INDEX "discussion_replies_thread_id_created_at_idx" ON "discussion_replies"("thread_id", "created_at");
CREATE INDEX "discussion_replies_author_id_idx" ON "discussion_replies"("author_id");
CREATE INDEX "discussion_replies_parent_id_idx" ON "discussion_replies"("parent_id");
CREATE INDEX "discussion_replies_deleted_at_idx" ON "discussion_replies"("deleted_at");

CREATE UNIQUE INDEX "discussion_thread_tags_thread_id_tag_key" ON "discussion_thread_tags"("thread_id", "tag");
CREATE INDEX "discussion_thread_tags_tag_idx" ON "discussion_thread_tags"("tag");
CREATE INDEX "discussion_thread_tags_thread_id_idx" ON "discussion_thread_tags"("thread_id");

CREATE INDEX "meeting_rooms_status_idx" ON "meeting_rooms"("status");
CREATE INDEX "meeting_rooms_scheduled_start_idx" ON "meeting_rooms"("scheduled_start");
CREATE INDEX "meeting_rooms_host_id_idx" ON "meeting_rooms"("host_id");
CREATE INDEX "meeting_rooms_conversation_id_idx" ON "meeting_rooms"("conversation_id");
CREATE INDEX "meeting_rooms_deleted_at_idx" ON "meeting_rooms"("deleted_at");

CREATE UNIQUE INDEX "meeting_participants_meeting_id_user_id_key" ON "meeting_participants"("meeting_id", "user_id");
CREATE INDEX "meeting_participants_user_id_idx" ON "meeting_participants"("user_id");
CREATE INDEX "meeting_participants_meeting_id_idx" ON "meeting_participants"("meeting_id");
CREATE INDEX "meeting_participants_status_idx" ON "meeting_participants"("status");

CREATE INDEX "meeting_recordings_meeting_id_idx" ON "meeting_recordings"("meeting_id");
CREATE INDEX "meeting_recordings_managed_file_id_idx" ON "meeting_recordings"("managed_file_id");
CREATE INDEX "meeting_recordings_deleted_at_idx" ON "meeting_recordings"("deleted_at");

CREATE INDEX "meeting_screen_shares_meeting_id_idx" ON "meeting_screen_shares"("meeting_id");
CREATE INDEX "meeting_screen_shares_user_id_idx" ON "meeting_screen_shares"("user_id");

-- Foreign keys
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "announcement_attachments" ADD CONSTRAINT "announcement_attachments_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "announcement_attachments" ADD CONSTRAINT "announcement_attachments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "discussion_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "discussion_replies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "discussion_thread_tags" ADD CONSTRAINT "discussion_thread_tags_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "discussion_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_rooms" ADD CONSTRAINT "meeting_rooms_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_rooms" ADD CONSTRAINT "meeting_rooms_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meeting_rooms" ADD CONSTRAINT "meeting_rooms_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meeting_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "meeting_recordings" ADD CONSTRAINT "meeting_recordings_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meeting_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_recordings" ADD CONSTRAINT "meeting_recordings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "meeting_screen_shares" ADD CONSTRAINT "meeting_screen_shares_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meeting_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_screen_shares" ADD CONSTRAINT "meeting_screen_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
