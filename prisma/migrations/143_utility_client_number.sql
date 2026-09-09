-- 143_utility_client_number.sql
-- Optional client (customer) number for property and rental utility accounts.

ALTER TABLE "property_utilities"
  ADD COLUMN IF NOT EXISTS "client_number" VARCHAR(128);

ALTER TABLE "rental_utilities"
  ADD COLUMN IF NOT EXISTS "client_number" TEXT;
