-- CreateEnum
CREATE TYPE "ai_message_role" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ai_assist_mode" AS ENUM ('ASK', 'EMAIL', 'PROPOSAL', 'SUMMARIZE', 'ANALYZE', 'IMPROVE', 'MEETING_NOTES', 'PROJECT_SUMMARY', 'TECHNICAL_DOCS');

-- CreateEnum
CREATE TYPE "ai_document_type" AS ENUM ('PROPOSAL', 'EMAIL', 'MEETING_NOTES', 'PROJECT_SUMMARY', 'TECHNICAL_DOCS', 'GENERAL');

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "ai_message_role" NOT NULL,
    "content" TEXT NOT NULL,
    "mode" "ai_assist_mode" NOT NULL DEFAULT 'ASK',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_documents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "type" "ai_document_type" NOT NULL,
    "prompt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ai_documents_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "ai_conversations_user_id_deleted_at_idx" ON "ai_conversations"("user_id", "deleted_at");
CREATE INDEX "ai_conversations_updated_at_idx" ON "ai_conversations"("updated_at");
CREATE INDEX "ai_conversations_title_idx" ON "ai_conversations"("title");

CREATE INDEX "ai_messages_conversation_id_created_at_idx" ON "ai_messages"("conversation_id", "created_at");

CREATE INDEX "ai_documents_user_id_deleted_at_idx" ON "ai_documents"("user_id", "deleted_at");
CREATE INDEX "ai_documents_type_idx" ON "ai_documents"("type");
CREATE INDEX "ai_documents_updated_at_idx" ON "ai_documents"("updated_at");
CREATE INDEX "ai_documents_title_idx" ON "ai_documents"("title");

-- Foreign keys
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_documents" ADD CONSTRAINT "ai_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_documents" ADD CONSTRAINT "ai_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
