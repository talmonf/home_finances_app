-- 021_medical_appointments.sql
-- Medical appointments: visit audit, how you paid, kupat holim / private insurance reimbursement tracking.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medical_appointment_payment_method') THEN
    CREATE TYPE "medical_appointment_payment_method" AS ENUM (
      'cash',
      'credit_card',
      'bank_account',
      'digital_wallet',
      'kupat_holim_benefit',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medical_reimbursement_request_scope') THEN
    CREATE TYPE "medical_reimbursement_request_scope" AS ENUM (
      'full',
      'partial'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "medical_appointments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "household_id" UUID NOT NULL,
  "family_member_id" UUID,
  "appointment_date" TIMESTAMP(3) NOT NULL,
  "provider_name" TEXT NOT NULL,
  "visit_description" TEXT,
  "amount_out_of_pocket" NUMERIC(15, 2),
  "currency" TEXT NOT NULL DEFAULT 'ILS',
  "payment_method" "medical_appointment_payment_method" NOT NULL,
  "credit_card_id" UUID,
  "bank_account_id" UUID,
  "digital_payment_method_id" UUID,
  "kupat_holim_request_submitted_at" TIMESTAMP(3),
  "kupat_holim_request_scope" "medical_reimbursement_request_scope",
  "kupat_holim_amount_received" NUMERIC(15, 2),
  "kupat_holim_notes" TEXT,
  "private_insurance_request_submitted_at" TIMESTAMP(3),
  "private_insurance_request_scope" "medical_reimbursement_request_scope",
  "private_insurance_amount_received" NUMERIC(15, 2),
  "private_insurance_notes" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "medical_appointments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "medical_appointments"
  DROP CONSTRAINT IF EXISTS "medical_appointments_household_id_fkey",
  ADD CONSTRAINT "medical_appointments_household_id_fkey"
    FOREIGN KEY ("household_id") REFERENCES "households"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "medical_appointments"
  DROP CONSTRAINT IF EXISTS "medical_appointments_family_member_id_fkey",
  ADD CONSTRAINT "medical_appointments_family_member_id_fkey"
    FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "medical_appointments"
  DROP CONSTRAINT IF EXISTS "medical_appointments_credit_card_id_fkey",
  ADD CONSTRAINT "medical_appointments_credit_card_id_fkey"
    FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "medical_appointments"
  DROP CONSTRAINT IF EXISTS "medical_appointments_bank_account_id_fkey",
  ADD CONSTRAINT "medical_appointments_bank_account_id_fkey"
    FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "medical_appointments"
  DROP CONSTRAINT IF EXISTS "medical_appointments_digital_payment_method_id_fkey",
  ADD CONSTRAINT "medical_appointments_digital_payment_method_id_fkey"
    FOREIGN KEY ("digital_payment_method_id") REFERENCES "digital_payment_methods"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_medical_appointments_household_date"
  ON "medical_appointments" ("household_id", "appointment_date" DESC);
