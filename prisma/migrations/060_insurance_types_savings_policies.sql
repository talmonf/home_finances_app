-- Insurance: policy type enum, optional car, optional policy holder; savings policies table.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'insurance_policy_type') THEN
    CREATE TYPE "insurance_policy_type" AS ENUM ('car', 'health', 'home', 'life', 'other');
  END IF;
END
$$;

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "policy_type" "insurance_policy_type" NOT NULL DEFAULT 'car';

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "policy_number" TEXT;

ALTER TABLE "insurance_policies"
  ADD COLUMN IF NOT EXISTS "family_member_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'insurance_policies_family_member_id_fkey'
  ) THEN
    ALTER TABLE "insurance_policies"
      ADD CONSTRAINT "insurance_policies_family_member_id_fkey"
      FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

ALTER TABLE "insurance_policies" ALTER COLUMN "car_id" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_insurance_policies_family_member_id" ON "insurance_policies" ("family_member_id");

CREATE TABLE IF NOT EXISTS "savings_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "provider_name" TEXT NOT NULL,
  "policy_name" TEXT NOT NULL,
  "policy_number" TEXT,
  "owner_family_member_id" UUID,
  "current_balance" DECIMAL(15, 2),
  "target_amount" DECIMAL(15, 2),
  "monthly_contribution" DECIMAL(15, 2),
  "currency" TEXT NOT NULL DEFAULT 'ILS',
  "start_date" TIMESTAMP(3),
  "maturity_date" TIMESTAMP(3),
  "renewal_date" TIMESTAMP(3),
  "bank_account_id" UUID,
  "digital_payment_method_id" UUID,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "savings_policies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_savings_policies_household_id" ON "savings_policies" ("household_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'savings_policies_household_id_fkey'
  ) THEN
    ALTER TABLE "savings_policies"
      ADD CONSTRAINT "savings_policies_household_id_fkey"
      FOREIGN KEY ("household_id") REFERENCES "households"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'savings_policies_owner_family_member_id_fkey'
  ) THEN
    ALTER TABLE "savings_policies"
      ADD CONSTRAINT "savings_policies_owner_family_member_id_fkey"
      FOREIGN KEY ("owner_family_member_id") REFERENCES "family_members"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'savings_policies_bank_account_id_fkey'
  ) THEN
    ALTER TABLE "savings_policies"
      ADD CONSTRAINT "savings_policies_bank_account_id_fkey"
      FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'savings_policies_digital_payment_method_id_fkey'
  ) THEN
    ALTER TABLE "savings_policies"
      ADD CONSTRAINT "savings_policies_digital_payment_method_id_fkey"
      FOREIGN KEY ("digital_payment_method_id") REFERENCES "digital_payment_methods"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
