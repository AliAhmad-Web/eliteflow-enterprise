-- Notification threaded replies (Phase 15.1 deep linking / context actions)
CREATE TABLE "notification_replies" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "synced_entity_type" VARCHAR(80),
    "synced_entity_id" UUID,
    "synced_comment_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notification_replies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_replies_notification_id_deleted_at_created_at_idx"
  ON "notification_replies"("notification_id", "deleted_at", "created_at");

CREATE INDEX "notification_replies_user_id_idx"
  ON "notification_replies"("user_id");

ALTER TABLE "notification_replies"
  ADD CONSTRAINT "notification_replies_notification_id_fkey"
  FOREIGN KEY ("notification_id") REFERENCES "notifications"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_replies"
  ADD CONSTRAINT "notification_replies_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
