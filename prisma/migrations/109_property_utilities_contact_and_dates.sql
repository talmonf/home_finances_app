-- 109_property_utilities_contact_and_dates.sql
-- Optional start date, website URL, and contact fields for property utility providers.

ALTER TABLE "property_utilities"
  ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "website_url" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_phone" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "contact_email" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "facebook_url" TEXT;
