-- Phase 16 — Enterprise Communication System

CREATE TYPE "conversation_type" AS ENUM ('DIRECT', 'GROUP', 'DEPARTMENT', 'TEAM', 'PROJECT', 'CLIENT');
CREATE TYPE "conversation_member_role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "message_kind" AS ENUM ('TEXT', 'SYSTEM');
CREATE TYPE "message_read_status" AS ENUM ('SENT', 'DELIVERED', 'SEEN');
CREATE TYPE "comment_entity_type" AS ENUM ('PROJECT', 'TASK', 'INVOICE', 'CLIENT', 'CALENDAR', 'FILE', 'REPORT', 'TEAM', 'AI_DOCUMENT');
CREATE TYPE "activity_entity_type" AS ENUM ('CLIENT', 'PROJECT', 'TASK', 'INVOICE', 'CALENDAR', 'FILE', 'AI', 'NOTIFICATION', 'TEAM', 'MESSAGE', 'COMMENT', 'CONVERSATION', 'USER', 'SYSTEM');

CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "type" "conversation_type" NOT NULL,
    "name" VARCHAR(200),
    "description" VARCHAR(1000),
    "avatar_url" VARCHAR(2048),
    "department_id" UUID,
    "team_id" UUID,
    "project_id" UUID,
    "client_id" UUID,
    "last_message_at" TIMESTAMP(3),
    "last_message_preview" VARCHAR(500),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation_members" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "conversation_member_role" NOT NULL DEFAULT 'MEMBER',
    "last_read_at" TIMESTAMP(3),
    "muted_until" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "message_kind" NOT NULL DEFAULT 'TEXT',
    "parent_id" UUID,
    "forwarded_from_id" UUID,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_attachments" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(2048) NOT NULL,
    "mime_type" VARCHAR(120),
    "size_bytes" INTEGER,
    "managed_file_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_reactions" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_reads" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "message_read_status" NOT NULL DEFAULT 'SENT',
    "delivered_at" TIMESTAMP(3),
    "seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "entity_type" "comment_entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "parent_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comment_attachments" (
    "id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(2048) NOT NULL,
    "mime_type" VARCHAR(120),
    "size_bytes" INTEGER,
    "managed_file_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "comment_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "body" VARCHAR(2000),
    "entity_type" "activity_entity_type" NOT NULL,
    "entity_id" UUID,
    "link_url" VARCHAR(500),
    "metadata" JSONB,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_attachments" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(2048) NOT NULL,
    "mime_type" VARCHAR(120),
    "size_bytes" INTEGER,
    "managed_file_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "activity_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_presence" (
    "user_id" UUID NOT NULL,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMP(3),
    "typing_conversation_id" UUID,
    "typing_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_presence_pkey" PRIMARY KEY ("user_id")
);

-- Indexes
CREATE INDEX "conversations_type_idx" ON "conversations"("type");
CREATE INDEX "conversations_department_id_idx" ON "conversations"("department_id");
CREATE INDEX "conversations_team_id_idx" ON "conversations"("team_id");
CREATE INDEX "conversations_project_id_idx" ON "conversations"("project_id");
CREATE INDEX "conversations_client_id_idx" ON "conversations"("client_id");
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at");
CREATE INDEX "conversations_deleted_at_idx" ON "conversations"("deleted_at");
CREATE INDEX "conversations_created_by_id_idx" ON "conversations"("created_by_id");

CREATE UNIQUE INDEX "conversation_members_conversation_id_user_id_key" ON "conversation_members"("conversation_id", "user_id");
CREATE INDEX "conversation_members_user_id_idx" ON "conversation_members"("user_id");
CREATE INDEX "conversation_members_conversation_id_idx" ON "conversation_members"("conversation_id");
CREATE INDEX "conversation_members_deleted_at_idx" ON "conversation_members"("deleted_at");

CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");
CREATE INDEX "messages_parent_id_idx" ON "messages"("parent_id");
CREATE INDEX "messages_is_pinned_idx" ON "messages"("is_pinned");
CREATE INDEX "messages_deleted_at_idx" ON "messages"("deleted_at");

CREATE INDEX "message_attachments_message_id_idx" ON "message_attachments"("message_id");
CREATE INDEX "message_attachments_managed_file_id_idx" ON "message_attachments"("managed_file_id");
CREATE INDEX "message_attachments_deleted_at_idx" ON "message_attachments"("deleted_at");

CREATE UNIQUE INDEX "message_reactions_message_id_user_id_emoji_key" ON "message_reactions"("message_id", "user_id", "emoji");
CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions"("message_id");
CREATE INDEX "message_reactions_user_id_idx" ON "message_reactions"("user_id");

CREATE UNIQUE INDEX "message_reads_message_id_user_id_key" ON "message_reads"("message_id", "user_id");
CREATE INDEX "message_reads_user_id_status_idx" ON "message_reads"("user_id", "status");
CREATE INDEX "message_reads_message_id_idx" ON "message_reads"("message_id");

CREATE INDEX "comments_entity_type_entity_id_created_at_idx" ON "comments"("entity_type", "entity_id", "created_at");
CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");
CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");
CREATE INDEX "comments_deleted_at_idx" ON "comments"("deleted_at");

CREATE INDEX "comment_attachments_comment_id_idx" ON "comment_attachments"("comment_id");
CREATE INDEX "comment_attachments_managed_file_id_idx" ON "comment_attachments"("managed_file_id");
CREATE INDEX "comment_attachments_deleted_at_idx" ON "comment_attachments"("deleted_at");

CREATE INDEX "activities_entity_type_entity_id_idx" ON "activities"("entity_type", "entity_id");
CREATE INDEX "activities_actor_id_idx" ON "activities"("actor_id");
CREATE INDEX "activities_action_idx" ON "activities"("action");
CREATE INDEX "activities_created_at_idx" ON "activities"("created_at");
CREATE INDEX "activities_deleted_at_idx" ON "activities"("deleted_at");

CREATE INDEX "activity_attachments_activity_id_idx" ON "activity_attachments"("activity_id");
CREATE INDEX "activity_attachments_managed_file_id_idx" ON "activity_attachments"("managed_file_id");
CREATE INDEX "activity_attachments_deleted_at_idx" ON "activity_attachments"("deleted_at");

CREATE INDEX "user_presence_is_online_idx" ON "user_presence"("is_online");
CREATE INDEX "user_presence_typing_conversation_id_idx" ON "user_presence"("typing_conversation_id");

-- Foreign keys
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_forwarded_from_id_fkey" FOREIGN KEY ("forwarded_from_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "comment_attachments" ADD CONSTRAINT "comment_attachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comment_attachments" ADD CONSTRAINT "comment_attachments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activity_attachments" ADD CONSTRAINT "activity_attachments_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_attachments" ADD CONSTRAINT "activity_attachments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
