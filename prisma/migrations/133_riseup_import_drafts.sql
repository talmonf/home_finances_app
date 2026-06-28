-- 133_riseup_import_drafts.sql
-- RiseUp import: persist in-progress review state between sessions (keyed by file hash).

CREATE TABLE IF NOT EXISTS "riseup_import_drafts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL UNIQUE REFERENCES "households"("id") ON DELETE CASCADE,
  "file_name" TEXT NOT NULL,
  "file_content_hash" TEXT NOT NULL,
  "row_count" INTEGER NOT NULL DEFAULT 0,
  "draft_state_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_riseup_import_drafts_file_content_hash"
  ON "riseup_import_drafts" ("file_content_hash");

CREATE OR REPLACE FUNCTION "set_riseup_import_drafts_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_riseup_import_drafts_updated_at" ON "riseup_import_drafts";
CREATE TRIGGER "trg_riseup_import_drafts_updated_at"
BEFORE UPDATE ON "riseup_import_drafts"
FOR EACH ROW
EXECUTE FUNCTION "set_riseup_import_drafts_updated_at"();
