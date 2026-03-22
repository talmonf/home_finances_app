-- 017_align_database_to_app_repo.sql
-- Align a PostgreSQL database that evolved with a broader schema back to what
-- home_finances_app expects (see prisma/schema.prisma and migrations 001–016).
--
-- BEFORE RUNNING: take a full backup (pg_dump).
-- Run after 014–016 (digital_payment_methods + linked bank + bank_account_members).
--
-- This script is IDEMPOTENT where possible (IF NOT EXISTS, IF EXISTS checks).
-- Review the OPTIONAL sections at the bottom before uncommenting them.
--
-- If source_records still has NULL document_id after this script, Prisma will
-- not match: delete or assign those rows to a document before enforcing NOT NULL.
--
-- After success: run `npx prisma generate` (schema already in repo).

-- ---------------------------------------------------------------------------
-- 1) transactions — column names and nullability expected by Prisma
-- ---------------------------------------------------------------------------

-- Prisma expects "transaction_direction", not "direction"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'direction'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'transaction_direction'
  ) THEN
    ALTER TABLE "transactions" RENAME COLUMN "direction" TO "transaction_direction";
  END IF;
END $$;

-- Repo columns (add if missing)
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "bank_account_id" UUID;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "document_id" UUID;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "study_or_class_id" UUID;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "import_status" "transaction_import_status";
UPDATE "transactions" SET "import_status" = 'pending_review'::transaction_import_status WHERE "import_status" IS NULL;
ALTER TABLE "transactions" ALTER COLUMN "import_status" SET DEFAULT 'pending_review'::transaction_import_status;
ALTER TABLE "transactions" ALTER COLUMN "import_status" SET NOT NULL;

ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "significant_purchase_id" UUID;

-- application import flow allows unattached transactions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'source_record_id'
  ) THEN
    ALTER TABLE "transactions" ALTER COLUMN "source_record_id" DROP NOT NULL;
  END IF;
END $$;

-- FKs (match prisma/schema.prisma)
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_bank_account_id_fkey";
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_bank_account_id_fkey"
  FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_document_id_fkey";
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_study_or_class_id_fkey";
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_study_or_class_id_fkey"
  FOREIGN KEY ("study_or_class_id") REFERENCES "studies_and_classes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_significant_purchase_id_fkey";
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_significant_purchase_id_fkey"
  FOREIGN KEY ("significant_purchase_id") REFERENCES "significant_purchases"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_transactions_bank_account" ON "transactions" ("bank_account_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_document" ON "transactions" ("document_id");

-- ---------------------------------------------------------------------------
-- 2) source_records — import pipeline shape (document + row_index + raw/parsed)
-- ---------------------------------------------------------------------------

-- Remove legacy link to digital_wallets (app uses digital_payment_methods)
ALTER TABLE "source_records" DROP CONSTRAINT IF EXISTS "source_records_digital_wallet_id_fkey";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "digital_wallet_id";

ALTER TABLE "source_records" ADD COLUMN IF NOT EXISTS "row_index" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "source_records" ADD COLUMN IF NOT EXISTS "raw_date" VARCHAR(128);
ALTER TABLE "source_records" ADD COLUMN IF NOT EXISTS "raw_amount" VARCHAR(128);
ALTER TABLE "source_records" ADD COLUMN IF NOT EXISTS "raw_description" TEXT;
ALTER TABLE "source_records" ADD COLUMN IF NOT EXISTS "raw_balance" VARCHAR(128);
ALTER TABLE "source_records" ADD COLUMN IF NOT EXISTS "parsed_date" TIMESTAMP(3);
ALTER TABLE "source_records" ADD COLUMN IF NOT EXISTS "parsed_amount" DECIMAL(15, 2);
ALTER TABLE "source_records" ADD COLUMN IF NOT EXISTS "parsed_direction" VARCHAR(32);

-- Backfill from a legacy “statement line” layout (only if those legacy columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'source_records' AND column_name = 'description'
  ) THEN
    EXECUTE $u$
      UPDATE "source_records" sr
      SET "raw_description" = COALESCE(sr."raw_description", sr."description")
      WHERE sr."description" IS NOT NULL
    $u$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'source_records' AND column_name = 'transaction_date'
  ) THEN
    EXECUTE $u$
      UPDATE "source_records" sr
      SET
        "raw_date" = COALESCE(sr."raw_date", sr."transaction_date"::text),
        "parsed_date" = COALESCE(sr."parsed_date", sr."transaction_date"::timestamp)
      WHERE sr."transaction_date" IS NOT NULL
    $u$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'source_records' AND column_name = 'original_amount'
  ) THEN
    EXECUTE $u$
      UPDATE "source_records" sr
      SET
        "raw_amount" = COALESCE(sr."raw_amount", sr."original_amount"::text),
        "parsed_amount" = COALESCE(sr."parsed_amount", sr."original_amount")
      WHERE sr."original_amount" IS NOT NULL
    $u$;
  END IF;
END $$;

-- Ensure document_id exists and is wired (Prisma requires it on source_records)
ALTER TABLE "source_records" ADD COLUMN IF NOT EXISTS "document_id" UUID;

ALTER TABLE "source_records" DROP CONSTRAINT IF EXISTS "source_records_document_id_fkey";
ALTER TABLE "source_records"
  ADD CONSTRAINT "source_records_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_source_records_document" ON "source_records" ("document_id");

-- Prisma requires document_id on every source_record; enforce only when no NULLs remain
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "source_records" WHERE "document_id" IS NULL) THEN
    ALTER TABLE "source_records" ALTER COLUMN "document_id" SET NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) categories — Prisma uses a single "name" column
-- ---------------------------------------------------------------------------

ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'name_en'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'name_he'
  ) THEN
    EXECUTE $u$
      UPDATE "categories"
      SET "name" = COALESCE(
        NULLIF(TRIM("name"), ''),
        NULLIF(TRIM("name_en"), ''),
        NULLIF(TRIM("name_he"), ''),
        'Uncategorized'
      )
      WHERE "name" IS NULL OR TRIM("name") = ''
    $u$;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'name_en'
  ) THEN
    EXECUTE $u$
      UPDATE "categories"
      SET "name" = COALESCE(NULLIF(TRIM("name"), ''), NULLIF(TRIM("name_en"), ''), 'Uncategorized')
      WHERE "name" IS NULL OR TRIM("name") = ''
    $u$;
  ELSE
    UPDATE "categories" SET "name" = 'Uncategorized' WHERE "name" IS NULL OR TRIM("name") = '';
  END IF;
END $$;

UPDATE "categories" SET "name" = 'Uncategorized' WHERE "name" IS NULL;

ALTER TABLE "categories" ALTER COLUMN "name" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 4) payees — optional columns used by the app (all nullable except core 003 fields)
-- ---------------------------------------------------------------------------

ALTER TABLE "payees" ADD COLUMN IF NOT EXISTS "normalized_name" VARCHAR(255);
ALTER TABLE "payees" ADD COLUMN IF NOT EXISTS "default_category_id" UUID;
ALTER TABLE "payees" ADD COLUMN IF NOT EXISTS "default_vehicle_id" UUID;
ALTER TABLE "payees" ADD COLUMN IF NOT EXISTS "default_property_id" UUID;
ALTER TABLE "payees" ADD COLUMN IF NOT EXISTS "is_charity" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payees" ADD COLUMN IF NOT EXISTS "seif_46_eligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payees" ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "payees" DROP CONSTRAINT IF EXISTS "payees_default_category_id_fkey";
ALTER TABLE "payees"
  ADD CONSTRAINT "payees_default_category_id_fkey"
  FOREIGN KEY ("default_category_id") REFERENCES "categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- default_vehicle_id is optional in Prisma without a FK to vehicles in repo schema

ALTER TABLE "payees" DROP CONSTRAINT IF EXISTS "payees_default_property_id_fkey";
ALTER TABLE "payees"
  ADD CONSTRAINT "payees_default_property_id_fkey"
  FOREIGN KEY ("default_property_id") REFERENCES "properties"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 5) documents — relax NOT NULL on fields the app does not set; map file_path → storage_path
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_by_user_id'
  ) THEN
    ALTER TABLE "documents" ALTER COLUMN "uploaded_by_user_id" DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "storage_path" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "bank_account_id" UUID;
-- Repo expects file_type (003: VARCHAR(64)); legacy schemas often only have mime_type
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "file_type" VARCHAR(64);

UPDATE "documents" d
SET "storage_path" = COALESCE(d."storage_path", d."file_path")
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'file_path'
);

-- Backfill file_type from mime_type when file_type is empty (file_type column exists after ADD above)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'mime_type'
  ) THEN
    UPDATE "documents" d
    SET "file_type" = COALESCE(NULLIF(TRIM(d."file_type"), ''), NULLIF(TRIM(d."mime_type"), ''))
    WHERE d."file_type" IS NULL OR TRIM(d."file_type") = '';
  END IF;
END $$;

ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_bank_account_id_fkey";
ALTER TABLE "documents"
  ADD CONSTRAINT "documents_bank_account_id_fkey"
  FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 6) bank_account_members — Prisma expects surrogate id + created_at
--    (safe if table was composite-PK only)
-- ---------------------------------------------------------------------------

ALTER TABLE "bank_account_members" ADD COLUMN IF NOT EXISTS "id" UUID DEFAULT gen_random_uuid();
ALTER TABLE "bank_account_members" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "bank_account_members" SET "id" = gen_random_uuid() WHERE "id" IS NULL;

DO $$
DECLARE
  pk_cols int;
BEGIN
  SELECT COUNT(*) INTO pk_cols
  FROM information_schema.key_column_usage k
  JOIN information_schema.table_constraints tc
    ON tc.constraint_name = k.constraint_name AND tc.table_schema = k.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'bank_account_members'
    AND tc.constraint_type = 'PRIMARY KEY';

  IF pk_cols > 1 THEN
    ALTER TABLE "bank_account_members" DROP CONSTRAINT IF EXISTS "bank_account_members_pkey";
    ALTER TABLE "bank_account_members" ADD PRIMARY KEY ("id");
  ELSIF pk_cols = 1 THEN
    -- single-column PK: if it is not "id", replace with id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.key_column_usage k
      JOIN information_schema.table_constraints tc
        ON tc.constraint_name = k.constraint_name AND tc.table_schema = k.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'bank_account_members'
        AND tc.constraint_type = 'PRIMARY KEY'
        AND k.column_name = 'id'
    ) THEN
      ALTER TABLE "bank_account_members" DROP CONSTRAINT IF EXISTS "bank_account_members_pkey";
      ALTER TABLE "bank_account_members" ADD PRIMARY KEY ("id");
    END IF;
  ELSE
    ALTER TABLE "bank_account_members" ADD PRIMARY KEY ("id");
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "bank_account_members_bank_account_id_family_member_id_key"
  ON "bank_account_members" ("bank_account_id", "family_member_id");

-- ---------------------------------------------------------------------------
-- 7) credit_cards — app model has no card_type / billing_day
-- ---------------------------------------------------------------------------

ALTER TABLE "credit_cards" DROP COLUMN IF EXISTS "card_type" CASCADE;
ALTER TABLE "credit_cards" DROP COLUMN IF EXISTS "billing_day" CASCADE;

-- ---------------------------------------------------------------------------
-- 8) properties — Prisma allows nullable property_type
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'property_type'
  ) THEN
    ALTER TABLE "properties" ALTER COLUMN "property_type" DROP NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 9) digital_wallets → digital_payment_methods, then drop legacy table
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.digital_wallets') IS NOT NULL THEN
    INSERT INTO "digital_payment_methods" (
      "id",
      "household_id",
      "name",
      "method_type",
      "linked_bank_account_id",
      "notes",
      "is_active",
      "created_at",
      "updated_at"
    )
    SELECT
      gen_random_uuid(),
      dw."household_id",
      COALESCE(NULLIF(TRIM(dw."wallet_type_name"), ''), INITCAP(dw."wallet_type"::text), 'Wallet'),
      CASE dw."wallet_type"::text
        WHEN 'bit' THEN 'bit'::digital_payment_method_type
        WHEN 'paybox' THEN 'paybox'::digital_payment_method_type
        WHEN 'paypal' THEN 'paypal'::digital_payment_method_type
        ELSE 'other'::digital_payment_method_type
      END,
      dw."linked_bank_account_id",
      NULL,
      dw."is_active",
      dw."created_at",
      dw."updated_at"
    FROM "digital_wallets" dw
    WHERE NOT EXISTS (
      SELECT 1 FROM "digital_payment_methods" dpm
      WHERE dpm."household_id" = dw."household_id"
        AND dpm."name" = COALESCE(NULLIF(TRIM(dw."wallet_type_name"), ''), INITCAP(dw."wallet_type"::text), 'Wallet')
    );

    DROP TABLE "digital_wallets" CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 10) Optional: drop tables not used by this app (UNCOMMENT ONLY after backup
--     and confirming no external tools use them). CASCADE removes dependent FKs.
-- ---------------------------------------------------------------------------
/*
DROP TABLE IF EXISTS "ai_categorization_rules" CASCADE;
DROP TABLE IF EXISTS "asset_family_members" CASCADE;
DROP TABLE IF EXISTS "audit_log" CASCADE;
DROP TABLE IF EXISTS "budgets" CASCADE;
DROP TABLE IF EXISTS "document_extraction_results" CASCADE;
DROP TABLE IF EXISTS "employers" CASCADE;
DROP TABLE IF EXISTS "exchange_rates" CASCADE;
DROP TABLE IF EXISTS "fund_contribution_records" CASCADE;
DROP TABLE IF EXISTS "fund_jobs" CASCADE;
DROP TABLE IF EXISTS "household_settings" CASCADE;
DROP TABLE IF EXISTS "installment_groups" CASCADE;
DROP TABLE IF EXISTS "investment_account_members" CASCADE;
DROP TABLE IF EXISTS "investment_accounts" CASCADE;
DROP TABLE IF EXISTS "investment_valuations" CASCADE;
DROP TABLE IF EXISTS "job_benefits" CASCADE;
DROP TABLE IF EXISTS "jobs" CASCADE;
DROP TABLE IF EXISTS "loan_members" CASCADE;
DROP TABLE IF EXISTS "loan_tracks" CASCADE;
DROP TABLE IF EXISTS "loans" CASCADE;
DROP TABLE IF EXISTS "pension_funds" CASCADE;
DROP TABLE IF EXISTS "pension_reconciliations" CASCADE;
DROP TABLE IF EXISTS "reconciliation_records" CASCADE;
DROP TABLE IF EXISTS "reconciliation_source_records" CASCADE;
DROP TABLE IF EXISTS "recurring_transactions" CASCADE;
DROP TABLE IF EXISTS "study_funds" CASCADE;
DROP TABLE IF EXISTS "tax_categories" CASCADE;
DROP TABLE IF EXISTS "tax_year_line_items" CASCADE;
DROP TABLE IF EXISTS "tax_year_summaries" CASCADE;
DROP TABLE IF EXISTS "transfers" CASCADE;
DROP TABLE IF EXISTS "vehicles" CASCADE;
*/

-- ---------------------------------------------------------------------------
-- 11) Optional: drop legacy columns on core tables (UNCOMMENT after verifying
--     no reporting depends on them). Dangerous if data is needed.
-- ---------------------------------------------------------------------------
/*
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "household_id";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "source_type";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "bank_account_id";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "credit_card_id";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "transaction_date";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "value_date";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "description";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "original_amount";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "original_currency";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "ils_amount";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "exchange_rate";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "exchange_rate_source";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "balance_after";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "reference_number";
ALTER TABLE "source_records" DROP COLUMN IF EXISTS "import_batch_id";
*/
