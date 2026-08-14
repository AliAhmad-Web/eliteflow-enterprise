-- Customer clarification reply + append-only history.
-- clarification_message remains the latest admin question and is never replaced by the reply.

ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "clarification_response" TEXT;
ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "clarification_history" JSONB;
