-- Insurance policies: insurance company, notes, optional policy document in object storage.

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "insurance_company" TEXT;

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "policy_file_name" TEXT;

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "policy_file_mime_type" TEXT;

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "policy_storage_bucket" TEXT;

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "policy_storage_key" TEXT;

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "policy_storage_url" TEXT;

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "policy_file_uploaded_at" TIMESTAMP(3);
