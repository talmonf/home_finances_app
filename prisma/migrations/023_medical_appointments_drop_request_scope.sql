-- 023_medical_appointments_drop_request_scope.sql
-- Remove per-channel "request scope" (full/partial); claim is for the receipt amount; payout is tracked separately.

ALTER TABLE "medical_appointments"
  DROP COLUMN IF EXISTS "kupat_holim_request_scope",
  DROP COLUMN IF EXISTS "private_insurance_request_scope";

DROP TYPE IF EXISTS "medical_reimbursement_request_scope";
