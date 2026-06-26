-- 127_property_utilities_meter_number.sql
-- Optional meter number for property utility accounts.

ALTER TABLE "property_utilities"
  ADD COLUMN IF NOT EXISTS "meter_number" VARCHAR(128);
