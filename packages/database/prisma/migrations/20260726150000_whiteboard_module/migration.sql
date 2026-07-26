-- CreateTable
CREATE TABLE "whiteboards" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "workspace_id" UUID,
    "project_id" UUID,
    "task_id" UUID,
    "client_id" UUID,
    "team_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "canvas_data" JSONB NOT NULL DEFAULT '{}',
    "thumbnail" TEXT,
    "owner_id" UUID NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "whiteboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whiteboard_versions" (
    "id" UUID NOT NULL,
    "whiteboard_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "canvas_data" JSONB NOT NULL,
    "thumbnail" TEXT,
    "created_by_id" UUID,
    "label" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whiteboard_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whiteboard_comments" (
    "id" UUID NOT NULL,
    "whiteboard_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "anchor_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "anchor_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "object_id" VARCHAR(64),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "whiteboard_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whiteboards_owner_id_deleted_at_idx" ON "whiteboards"("owner_id", "deleted_at");
CREATE INDEX "whiteboards_project_id_deleted_at_idx" ON "whiteboards"("project_id", "deleted_at");
CREATE INDEX "whiteboards_task_id_deleted_at_idx" ON "whiteboards"("task_id", "deleted_at");
CREATE INDEX "whiteboards_client_id_deleted_at_idx" ON "whiteboards"("client_id", "deleted_at");
CREATE INDEX "whiteboards_team_id_deleted_at_idx" ON "whiteboards"("team_id", "deleted_at");
CREATE INDEX "whiteboards_updated_at_idx" ON "whiteboards"("updated_at");

CREATE UNIQUE INDEX "whiteboard_versions_whiteboard_id_version_key" ON "whiteboard_versions"("whiteboard_id", "version");
CREATE INDEX "whiteboard_versions_whiteboard_id_created_at_idx" ON "whiteboard_versions"("whiteboard_id", "created_at");

CREATE INDEX "whiteboard_comments_whiteboard_id_deleted_at_idx" ON "whiteboard_comments"("whiteboard_id", "deleted_at");
CREATE INDEX "whiteboard_comments_author_id_idx" ON "whiteboard_comments"("author_id");

-- AddForeignKey
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "hr_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whiteboard_versions" ADD CONSTRAINT "whiteboard_versions_whiteboard_id_fkey" FOREIGN KEY ("whiteboard_id") REFERENCES "whiteboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whiteboard_versions" ADD CONSTRAINT "whiteboard_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whiteboard_comments" ADD CONSTRAINT "whiteboard_comments_whiteboard_id_fkey" FOREIGN KEY ("whiteboard_id") REFERENCES "whiteboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whiteboard_comments" ADD CONSTRAINT "whiteboard_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
