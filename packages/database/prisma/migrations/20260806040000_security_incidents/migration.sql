-- Phase 3 Step 10 — Enterprise Security Monitoring & Threat Detection

CREATE TYPE "security_incident_status" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED');

CREATE TABLE IF NOT EXISTS "security_incidents" (
  "id" UUID NOT NULL,
  "type" VARCHAR(100) NOT NULL,
  "severity" "security_severity" NOT NULL,
  "status" "security_incident_status" NOT NULL DEFAULT 'OPEN',
  "actor_user_id" UUID,
  "resource" VARCHAR(120),
  "resource_id" VARCHAR(100),
  "count" INTEGER NOT NULL DEFAULT 1,
  "correlation_key" VARCHAR(255) NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "metadata" JSONB,
  "window_started_at" TIMESTAMP(3) NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL,
  "resolved_at" TIMESTAMP(3),
  "resolved_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "security_incidents_status_severity_last_seen_at_idx"
  ON "security_incidents"("status", "severity", "last_seen_at");
CREATE INDEX IF NOT EXISTS "security_incidents_type_last_seen_at_idx"
  ON "security_incidents"("type", "last_seen_at");
CREATE INDEX IF NOT EXISTS "security_incidents_correlation_key_status_idx"
  ON "security_incidents"("correlation_key", "status");
CREATE INDEX IF NOT EXISTS "security_incidents_actor_user_id_status_idx"
  ON "security_incidents"("actor_user_id", "status");

ALTER TABLE "security_events"
  ADD COLUMN IF NOT EXISTS "incident_id" UUID;

CREATE INDEX IF NOT EXISTS "security_events_event_type_created_at_idx"
  ON "security_events"("event_type", "created_at");
CREATE INDEX IF NOT EXISTS "security_events_incident_id_idx"
  ON "security_events"("incident_id");

ALTER TABLE "security_events"
  DROP CONSTRAINT IF EXISTS "security_events_incident_id_fkey";
ALTER TABLE "security_events"
  ADD CONSTRAINT "security_events_incident_id_fkey"
  FOREIGN KEY ("incident_id") REFERENCES "security_incidents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
