-- 087: Align documents table for Prisma compatibility on legacy/local DBs.
-- Purpose: prevent P2022 errors on prisma.documents.findMany() when older
-- databases are missing one or more expected columns.
-- Safe to run multiple times (idempotent).

-- Ensure enum used by documents.processing_status exists.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_processing_status') THEN
    CREATE TYPE document_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
END
$$;

-- Create table if it does not exist at all (legacy/local edge case).
CREATE TABLE IF NOT EXISTS "documents" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "household_id" UUID NOT NULL REFERENCES "households"("id"),
  "bank_account_id" UUID REFERENCES "bank_accounts"("id"),
  "file_name" VARCHAR(512) NOT NULL,
  "file_type" VARCHAR(64) NOT NULL,
  "storage_path" VARCHAR(1024),
  "processing_status" document_processing_status NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ensure Prisma-expected columns exist on pre-existing tables.
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "bank_account_id" UUID;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "file_type" VARCHAR(64);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "storage_path" VARCHAR(1024);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "processing_status" document_processing_status;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT NOW();

-- Backfill file_type from mime_type where possible, otherwise "unknown".
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'mime_type'
  ) THEN
    UPDATE "documents" d
    SET "file_type" = COALESCE(NULLIF(TRIM(d."file_type"), ''), NULLIF(TRIM(d."mime_type"), ''), 'unknown')
    WHERE d."file_type" IS NULL OR TRIM(d."file_type") = '';
  ELSE
    UPDATE "documents" d
    SET "file_type" = 'unknown'
    WHERE d."file_type" IS NULL OR TRIM(d."file_type") = '';
  END IF;
END
$$;

-- Backfill processing_status default where missing.
UPDATE "documents"
SET "processing_status" = 'pending'::document_processing_status
WHERE "processing_status" IS NULL;

-- Keep constraints compatible with Prisma model.
ALTER TABLE "documents"
  ALTER COLUMN "file_type" SET NOT NULL,
  ALTER COLUMN "processing_status" SET NOT NULL,
  ALTER COLUMN "processing_status" SET DEFAULT 'pending'::document_processing_status;

ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_bank_account_id_fkey";
ALTER TABLE "documents"
  ADD CONSTRAINT "documents_bank_account_id_fkey"
  FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_documents_household" ON "documents" ("household_id");
CREATE INDEX IF NOT EXISTS "idx_documents_created_at" ON "documents" ("created_at");

-- Sanity check output: should report all required columns as present.
DO $$
DECLARE
  missing_columns TEXT;
BEGIN
  SELECT string_agg(col_name, ', ')
  INTO missing_columns
  FROM (
    SELECT v.col_name
    FROM (VALUES
      ('id'),
      ('household_id'),
      ('bank_account_id'),
      ('file_name'),
      ('file_type'),
      ('storage_path'),
      ('processing_status'),
      ('created_at'),
      ('updated_at')
    ) AS v(col_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'documents'
        AND c.column_name = v.col_name
    )
  ) m;

  IF missing_columns IS NULL THEN
    RAISE NOTICE 'documents alignment check: OK (all required columns exist).';
  ELSE
    RAISE NOTICE 'documents alignment check: missing columns -> %', missing_columns;
  END IF;
END
$$;
