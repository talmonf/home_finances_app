-- Upcoming renewals: identities, insurance policies, donation commitments,
-- plus renewal/expiry dates on utilities and credit cards.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'identity_type') THEN
    CREATE TYPE "identity_type" AS ENUM (
      'passport',
      'national_id',
      'driver_license',
      'car_license',
      'other'
    );
  END IF;
END $$;

ALTER TABLE "credit_cards"
  ADD COLUMN IF NOT EXISTS "expiry_date" TIMESTAMP(3);

ALTER TABLE "property_utilities"
  ADD COLUMN IF NOT EXISTS "renewal_date" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "identities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "family_member_id" UUID NOT NULL,
  "identity_type" "identity_type" NOT NULL,
  "identifier" TEXT,
  "expiry_date" TIMESTAMP(3) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "insurance_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "family_member_id" UUID,
  "provider_name" TEXT NOT NULL,
  "policy_name" TEXT NOT NULL,
  "expiration_date" TIMESTAMP(3) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "donation_commitments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "payee_id" UUID NOT NULL,
  "renewal_date" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "donation_commitments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "identities"
  DROP CONSTRAINT IF EXISTS "identities_household_id_fkey",
  ADD CONSTRAINT "identities_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identities"
  DROP CONSTRAINT IF EXISTS "identities_family_member_id_fkey",
  ADD CONSTRAINT "identities_family_member_id_fkey"
    FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "insurance_policies"
  DROP CONSTRAINT IF EXISTS "insurance_policies_household_id_fkey",
  ADD CONSTRAINT "insurance_policies_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "insurance_policies"
  DROP CONSTRAINT IF EXISTS "insurance_policies_family_member_id_fkey",
  ADD CONSTRAINT "insurance_policies_family_member_id_fkey"
    FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "donation_commitments"
  DROP CONSTRAINT IF EXISTS "donation_commitments_household_id_fkey",
  ADD CONSTRAINT "donation_commitments_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "donation_commitments"
  DROP CONSTRAINT IF EXISTS "donation_commitments_payee_id_fkey",
  ADD CONSTRAINT "donation_commitments_payee_id_fkey"
    FOREIGN KEY ("payee_id") REFERENCES "payees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

