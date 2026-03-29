-- 022_medical_appointments_reimbursement_received.sql
-- Single reimbursement amount + date + source (kupat holim vs private insurance).
-- Drops per-channel amount_received columns after copying data.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medical_reimbursement_source') THEN
    CREATE TYPE "medical_reimbursement_source" AS ENUM (
      'kupat_holim',
      'private_insurance'
    );
  END IF;
END $$;

ALTER TABLE "medical_appointments"
  ADD COLUMN IF NOT EXISTS "reimbursement_received_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reimbursement_source" "medical_reimbursement_source",
  ADD COLUMN IF NOT EXISTS "reimbursement_amount_received" NUMERIC(15, 2);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'medical_appointments'
      AND column_name = 'kupat_holim_amount_received'
  ) THEN
    UPDATE "medical_appointments"
    SET
      "reimbursement_amount_received" = COALESCE(
        "kupat_holim_amount_received",
        "private_insurance_amount_received"
      ),
      "reimbursement_source" = CASE
        WHEN "kupat_holim_amount_received" IS NOT NULL THEN 'kupat_holim'::"medical_reimbursement_source"
        WHEN "private_insurance_amount_received" IS NOT NULL THEN 'private_insurance'::"medical_reimbursement_source"
        ELSE NULL
      END
    WHERE
      "reimbursement_amount_received" IS NULL
      AND (
        "kupat_holim_amount_received" IS NOT NULL
        OR "private_insurance_amount_received" IS NOT NULL
      );

    ALTER TABLE "medical_appointments" DROP COLUMN "kupat_holim_amount_received";
    ALTER TABLE "medical_appointments" DROP COLUMN "private_insurance_amount_received";
  END IF;
END $$;
