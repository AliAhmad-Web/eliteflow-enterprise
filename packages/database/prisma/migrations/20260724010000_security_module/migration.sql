-- Phase 17: Enterprise Security — PasswordHistory + SecurityEvent

CREATE TYPE "security_severity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "security_event_category" AS ENUM ('AUTH', 'ACCOUNT', 'SESSION', 'ACCESS', 'FILE', 'API', 'CAPTCHA', 'RATE_LIMIT', 'POLICY');

CREATE TABLE "password_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_events" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "severity" "security_severity" NOT NULL DEFAULT 'INFO',
    "category" "security_event_category" NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(1024),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "password_history_user_id_created_at_idx" ON "password_history"("user_id", "created_at");
CREATE INDEX "security_events_severity_created_at_idx" ON "security_events"("severity", "created_at");
CREATE INDEX "security_events_category_created_at_idx" ON "security_events"("category", "created_at");
CREATE INDEX "security_events_user_id_created_at_idx" ON "security_events"("user_id", "created_at");
CREATE INDEX "security_events_resolved_at_created_at_idx" ON "security_events"("resolved_at", "created_at");

ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
