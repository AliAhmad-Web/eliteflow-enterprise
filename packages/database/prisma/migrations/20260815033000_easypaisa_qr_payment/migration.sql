-- EasyPaisa QR is the Pakistan customer payment path. Store ID / Hash Key are not required.
UPDATE "payment_method_configs"
SET
  "display_name" = 'Pay via EasyPaisa QR',
  "merchant_public_id" = COALESCE(NULLIF("merchant_public_id", ''), '********2254'),
  "instructions" = 'Scan the EasyPaisa QR to send money to ALI AHMED (MSISDN ********2254). Pay the exact invoice amount, then enter your EasyPaisa Transaction ID / Reference ID. Payment is confirmed only after admin verification.',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "method" = 'EASYPAISA';
