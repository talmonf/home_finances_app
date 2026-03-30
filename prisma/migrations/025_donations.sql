-- Donations: one-time gifts and monthly commitments with organization details (Israel tax / Seif 46).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donation_kind') THEN
    CREATE TYPE "donation_kind" AS ENUM (
      'one_time',
      'monthly_commitment'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "donations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "kind" "donation_kind" NOT NULL,
  "one_time_amount" DECIMAL(15, 2),
  "donation_date" TIMESTAMP(3),
  "monthly_amount" DECIMAL(15, 2),
  "commitment_months" INTEGER,
  "commitment_start_date" TIMESTAMP(3),
  "organization_name" TEXT NOT NULL,
  "organization_tax_number" TEXT,
  "provides_seif_46_receipts" BOOLEAN NOT NULL DEFAULT false,
  "organization_phone" TEXT,
  "organization_email" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'ILS',
  "payee_id" UUID,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "donations"
  DROP CONSTRAINT IF EXISTS "donations_household_id_fkey",
  ADD CONSTRAINT "donations_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "donations"
  DROP CONSTRAINT IF EXISTS "donations_payee_id_fkey",
  ADD CONSTRAINT "donations_payee_id_fkey"
    FOREIGN KEY ("payee_id") REFERENCES "payees"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
