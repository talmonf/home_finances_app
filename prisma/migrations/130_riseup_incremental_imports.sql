-- 130_riseup_incremental_imports.sql
-- Add durable RiseUp import identity, content hashes, and import audit metadata.

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "riseup_import_key" TEXT;

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "riseup_content_hash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "transactions_riseup_import_key_unique_idx"
  ON "transactions" ("household_id", "riseup_import_key")
  WHERE "riseup_import_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_transactions_riseup_content_hash"
  ON "transactions" ("household_id", "riseup_content_hash")
  WHERE "riseup_content_hash" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "riseup_import_audits" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "file_name" TEXT NOT NULL,
  "import_mode" TEXT NOT NULL DEFAULT 'incremental',
  "status" TEXT NOT NULL DEFAULT 'successful',
  "row_count" INTEGER NOT NULL DEFAULT 0,
  "created_transactions" INTEGER NOT NULL DEFAULT 0,
  "updated_transactions" INTEGER NOT NULL DEFAULT 0,
  "skipped_transactions" INTEGER NOT NULL DEFAULT 0,
  "changed_rows" INTEGER NOT NULL DEFAULT 0,
  "ambiguous_rows" INTEGER NOT NULL DEFAULT 0,
  "failure_message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_riseup_import_audits_household_created"
  ON "riseup_import_audits" ("household_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_riseup_import_audits_user_created"
  ON "riseup_import_audits" ("user_id", "created_at" DESC);

CREATE OR REPLACE FUNCTION "set_riseup_import_audits_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_riseup_import_audits_updated_at" ON "riseup_import_audits";
CREATE TRIGGER "trg_riseup_import_audits_updated_at"
BEFORE UPDATE ON "riseup_import_audits"
FOR EACH ROW
EXECUTE FUNCTION "set_riseup_import_audits_updated_at"();
