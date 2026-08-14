-- JazzCash QR is the Pakistan customer payment path. No merchant API secrets required.
UPDATE "payment_method_configs"
SET
  "display_name" = 'Pay via JazzCash QR',
  "merchant_public_id" = COALESCE(NULLIF("merchant_public_id", ''), '984175579'),
  "instructions" = 'Scan the JazzCash QR or dial *786*10# and enter Till ID 984175579. Pay the exact invoice amount, then enter your JazzCash transaction ID. Payment is confirmed only after admin verification.',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "method" = 'JAZZCASH';
