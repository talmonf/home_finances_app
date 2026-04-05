-- Car-linked insurance only: drop family_member; require car_id; policy start + premium.

ALTER TABLE "insurance_policies" ADD COLUMN IF NOT EXISTS "policy_start_date" TIMESTAMP(3);
ALTER TABLE "insurance_policies" ADD COLUMN IF NOT EXISTS "premium_paid" DECIMAL(15, 2);
ALTER TABLE "insurance_policies" ADD COLUMN IF NOT EXISTS "premium_currency" TEXT NOT NULL DEFAULT 'ILS';

UPDATE "insurance_policies" SET "policy_start_date" = "created_at" WHERE "policy_start_date" IS NULL;
ALTER TABLE "insurance_policies" ALTER COLUMN "policy_start_date" SET NOT NULL;

UPDATE "insurance_policies" SET "premium_paid" = 0 WHERE "premium_paid" IS NULL;
ALTER TABLE "insurance_policies" ALTER COLUMN "premium_paid" SET NOT NULL;

ALTER TABLE "insurance_policies" DROP CONSTRAINT IF EXISTS "insurance_policies_family_member_id_fkey";
ALTER TABLE "insurance_policies" DROP COLUMN IF EXISTS "family_member_id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "insurance_policies" WHERE "car_id" IS NULL) THEN
    RAISE EXCEPTION 'insurance_policies: assign car_id to every row (or delete non-car policies) before running this migration.';
  END IF;
END $$;

ALTER TABLE "insurance_policies" DROP CONSTRAINT IF EXISTS "insurance_policies_car_id_fkey";

ALTER TABLE "insurance_policies" ALTER COLUMN "car_id" SET NOT NULL;

ALTER TABLE "insurance_policies"
  ADD CONSTRAINT "insurance_policies_car_id_fkey"
  FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
