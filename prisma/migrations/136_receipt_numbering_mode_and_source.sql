-- Per-job Morning receipt numbering mode and receipt number source tracking.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'morning_receipt_numbering_mode') THEN
    CREATE TYPE "morning_receipt_numbering_mode" AS ENUM ('manual', 'morning_auto', 'ask_each_time');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_receipt_number_source') THEN
    CREATE TYPE "therapy_receipt_number_source" AS ENUM ('manual', 'morning', 'pending_morning');
  END IF;
END $$;

ALTER TABLE "job_morning_integrations"
  ADD COLUMN IF NOT EXISTS "receipt_numbering_mode" "morning_receipt_numbering_mode" NOT NULL DEFAULT 'ask_each_time';

ALTER TABLE "therapy_receipts"
  ADD COLUMN IF NOT EXISTS "receipt_number_source" "therapy_receipt_number_source";
