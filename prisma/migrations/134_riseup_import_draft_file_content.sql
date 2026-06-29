-- 134_riseup_import_draft_file_content.sql
-- Store the RiseUp CSV export alongside the draft so sessions can resume without re-upload.

ALTER TABLE "riseup_import_drafts"
  ADD COLUMN IF NOT EXISTS "file_content" BYTEA;
