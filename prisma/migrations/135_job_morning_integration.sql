-- Morning (Green Invoice) integration: per-job credentials, client external IDs, receipt document storage.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'morning_environment') THEN
    CREATE TYPE "morning_environment" AS ENUM ('sandbox', 'production');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'morning_issue_status') THEN
    CREATE TYPE "morning_issue_status" AS ENUM ('pending', 'issued', 'failed');
  END IF;
END $$;

-- Recover from partial apply where job_id/household_id were TEXT (FK to jobs.id UUID could not be added).
DROP TABLE IF EXISTS "job_morning_integrations";

CREATE TABLE "job_morning_integrations" (
  "job_id" UUID NOT NULL,
  "household_id" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "environment" "morning_environment" NOT NULL DEFAULT 'sandbox',
  "api_key_id_encrypted" TEXT,
  "api_secret_encrypted" TEXT,
  "business_id" TEXT,
  "business_name" TEXT,
  "business_tax_id" TEXT,
  "default_document_type" INTEGER NOT NULL DEFAULT 400,
  "last_tested_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "job_morning_integrations_pkey" PRIMARY KEY ("job_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_morning_integrations_job_id_fkey'
  ) THEN
    ALTER TABLE "job_morning_integrations"
      ADD CONSTRAINT "job_morning_integrations_job_id_fkey"
      FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_morning_integrations_household_id_fkey'
  ) THEN
    ALTER TABLE "job_morning_integrations"
      ADD CONSTRAINT "job_morning_integrations_household_id_fkey"
      FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_job_morning_integrations_household_id"
  ON "job_morning_integrations" ("household_id");

ALTER TABLE "therapy_clients"
  ADD COLUMN IF NOT EXISTS "morning_client_id" TEXT;

ALTER TABLE "therapy_receipts"
  ADD COLUMN IF NOT EXISTS "morning_document_id" TEXT,
  ADD COLUMN IF NOT EXISTS "morning_issued_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "morning_issue_status" "morning_issue_status",
  ADD COLUMN IF NOT EXISTS "morning_issue_error" TEXT,
  ADD COLUMN IF NOT EXISTS "document_file_name" TEXT,
  ADD COLUMN IF NOT EXISTS "document_mime_type" TEXT,
  ADD COLUMN IF NOT EXISTS "document_storage_bucket" TEXT,
  ADD COLUMN IF NOT EXISTS "document_storage_key" TEXT,
  ADD COLUMN IF NOT EXISTS "document_uploaded_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "idx_therapy_receipts_morning_document_id"
  ON "therapy_receipts" ("household_id", "morning_document_id")
  WHERE "morning_document_id" IS NOT NULL;
