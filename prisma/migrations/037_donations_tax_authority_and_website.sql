-- Donations: Tax Authority submission flag + organization website URL.

ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "organization_website_url" TEXT;

ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "tax_authority_info_passed" BOOLEAN NOT NULL DEFAULT false;

