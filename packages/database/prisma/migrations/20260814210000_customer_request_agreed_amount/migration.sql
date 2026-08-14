-- Final negotiated deal amount. expected_budget remains the original customer submission.

ALTER TABLE "customer_requests" ADD COLUMN IF NOT EXISTS "agreed_amount" DECIMAL(14, 2);
