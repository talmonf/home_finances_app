-- Optional notes field for identity items

ALTER TABLE "identities"
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

