-- Loans: household loans with repayment schedule and optional maturity.

CREATE TABLE IF NOT EXISTS "loans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "loan_date" TIMESTAMP(3) NOT NULL,
  "loan_amount" DECIMAL(15, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ILS',
  "institution_name" TEXT NOT NULL,
  "loan_number" TEXT,
  "monthly_repayment_amount" DECIMAL(15, 2),
  "repayment_day_of_month" INTEGER,
  "maturity_date" TIMESTAMP(3),
  "total_repayment_amount" DECIMAL(15, 2),
  "purpose" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loans_repayment_day_of_month_check"
    CHECK ("repayment_day_of_month" IS NULL OR ("repayment_day_of_month" >= 1 AND "repayment_day_of_month" <= 31))
);

CREATE INDEX IF NOT EXISTS "idx_loans_household_id" ON "loans" ("household_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loans_household_id_fkey'
  ) THEN
    ALTER TABLE "loans"
      ADD CONSTRAINT "loans_household_id_fkey"
      FOREIGN KEY ("household_id") REFERENCES "households"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
