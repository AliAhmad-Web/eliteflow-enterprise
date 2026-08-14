-- Allow onboarding CustomerRequests without a linked Client/Company.
-- Requester identity remains created_by_id; admin associates client_id later.

ALTER TABLE "customer_requests" ALTER COLUMN "client_id" DROP NOT NULL;
