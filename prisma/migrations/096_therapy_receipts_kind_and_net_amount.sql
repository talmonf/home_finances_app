-- 096_therapy_receipts_kind_and_net_amount.sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_receipt_kind') THEN
    CREATE TYPE "therapy_receipt_kind" AS ENUM ('regular', 'salary_fictitious');
  END IF;
END $$;

ALTER TABLE "therapy_receipts"
  ADD COLUMN IF NOT EXISTS "receipt_kind" "therapy_receipt_kind" NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS "net_amount" DECIMAL(15, 2);

UPDATE "therapy_receipts"
SET "net_amount" = "total_amount"
WHERE "net_amount" IS NULL;

ALTER TABLE "therapy_receipts"
  ALTER COLUMN "net_amount" SET NOT NULL;
