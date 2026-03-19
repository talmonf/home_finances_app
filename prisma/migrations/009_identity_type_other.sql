-- Add optional free-text label when IdentityType = other

ALTER TABLE "identities"
  ADD COLUMN IF NOT EXISTS "identity_type_other" TEXT;

