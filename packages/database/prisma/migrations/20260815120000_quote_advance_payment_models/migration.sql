-- Configurable 35%/40% advance models and customer-selectable options on the quote.
-- Deal amount remains Quote.total; CustomerRequest.expectedBudget stays historical.

ALTER TYPE "payment_model" ADD VALUE IF NOT EXISTS 'SPLIT_35_65';
ALTER TYPE "payment_model" ADD VALUE IF NOT EXISTS 'SPLIT_40_60';

ALTER TABLE "quotes"
ADD COLUMN IF NOT EXISTS "allowed_payment_models" "payment_model"[] NOT NULL DEFAULT ARRAY[]::"payment_model"[];
