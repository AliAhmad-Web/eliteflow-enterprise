-- CreateEnum
CREATE TYPE "file_category" AS ENUM ('IMAGE', 'PDF', 'DOCUMENT', 'SPREADSHEET', 'PRESENTATION', 'ARCHIVE', 'TEXT', 'VIDEO', 'AUDIO', 'OTHER');

-- CreateEnum
CREATE TYPE "file_activity_action" AS ENUM ('UPLOADED', 'DOWNLOADED', 'RENAMED', 'MOVED', 'UPDATED', 'FAVORITED', 'UNFAVORITED', 'SHARED', 'UNSHARED', 'DELETED', 'RESTORED', 'PERMANENTLY_DELETED', 'VERSION_CREATED');

-- CreateEnum
CREATE TYPE "file_share_access" AS ENUM ('VIEW', 'DOWNLOAD');

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "parent_id" UUID,
    "project_id" UUID,
    "client_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managed_files" (
    "id" UUID NOT NULL,
    "folder_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(150) NOT NULL,
    "extension" VARCHAR(20) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "category" "file_category" NOT NULL,
    "storage_key" VARCHAR(1024) NOT NULL,
    "storage_provider" VARCHAR(40) NOT NULL,
    "checksum" VARCHAR(128),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "project_id" UUID,
    "client_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "managed_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_versions" (
    "id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "storage_key" VARCHAR(1024) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "mime_type" VARCHAR(150) NOT NULL,
    "note" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_shares" (
    "id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "shared_with_user_id" UUID,
    "shared_with_client_id" UUID,
    "access" "file_share_access" NOT NULL DEFAULT 'DOWNLOAD',
    "created_by_id" UUID,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_activities" (
    "id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" "file_activity_action" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_activities_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "folders_parent_id_deleted_at_idx" ON "folders"("parent_id", "deleted_at");
CREATE INDEX "folders_project_id_idx" ON "folders"("project_id");
CREATE INDEX "folders_client_id_idx" ON "folders"("client_id");
CREATE INDEX "folders_created_by_id_idx" ON "folders"("created_by_id");
CREATE INDEX "folders_name_idx" ON "folders"("name");

CREATE INDEX "managed_files_folder_id_deleted_at_idx" ON "managed_files"("folder_id", "deleted_at");
CREATE INDEX "managed_files_project_id_idx" ON "managed_files"("project_id");
CREATE INDEX "managed_files_client_id_idx" ON "managed_files"("client_id");
CREATE INDEX "managed_files_created_by_id_idx" ON "managed_files"("created_by_id");
CREATE INDEX "managed_files_category_idx" ON "managed_files"("category");
CREATE INDEX "managed_files_is_favorite_idx" ON "managed_files"("is_favorite");
CREATE INDEX "managed_files_name_idx" ON "managed_files"("name");
CREATE INDEX "managed_files_updated_at_idx" ON "managed_files"("updated_at");

CREATE UNIQUE INDEX "file_versions_file_id_version_key" ON "file_versions"("file_id", "version");
CREATE INDEX "file_versions_file_id_created_at_idx" ON "file_versions"("file_id", "created_at");

CREATE INDEX "file_shares_file_id_idx" ON "file_shares"("file_id");
CREATE INDEX "file_shares_shared_with_user_id_idx" ON "file_shares"("shared_with_user_id");
CREATE INDEX "file_shares_shared_with_client_id_idx" ON "file_shares"("shared_with_client_id");

CREATE INDEX "file_activities_file_id_created_at_idx" ON "file_activities"("file_id", "created_at");
CREATE INDEX "file_activities_actor_id_idx" ON "file_activities"("actor_id");

-- Foreign keys
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folders" ADD CONSTRAINT "folders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folders" ADD CONSTRAINT "folders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folders" ADD CONSTRAINT "folders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folders" ADD CONSTRAINT "folders_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "managed_files" ADD CONSTRAINT "managed_files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "managed_files" ADD CONSTRAINT "managed_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "managed_files" ADD CONSTRAINT "managed_files_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "managed_files" ADD CONSTRAINT "managed_files_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "managed_files" ADD CONSTRAINT "managed_files_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "managed_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "managed_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_shared_with_user_id_fkey" FOREIGN KEY ("shared_with_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_shared_with_client_id_fkey" FOREIGN KEY ("shared_with_client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "file_activities" ADD CONSTRAINT "file_activities_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "managed_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_activities" ADD CONSTRAINT "file_activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
