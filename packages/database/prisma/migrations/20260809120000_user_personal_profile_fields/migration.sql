-- Personal profile fields on users (self-service profile page)

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "address" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "city" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "country" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
