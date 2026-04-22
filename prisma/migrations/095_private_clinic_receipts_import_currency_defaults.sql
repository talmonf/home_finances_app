-- 095_private_clinic_receipts_import_currency_defaults.sql
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "default_currency" TEXT;

UPDATE "users" u
SET "default_currency" = h."primary_currency"
FROM "households" h
WHERE u."household_id" = h."id"
  AND (u."default_currency" IS NULL OR btrim(u."default_currency") = '');

ALTER TABLE "therapy_settings"
  ADD COLUMN IF NOT EXISTS "usual_treatment_cost_currency_for_import" TEXT;

UPDATE "therapy_settings" ts
SET "usual_treatment_cost_currency_for_import" = h."primary_currency"
FROM "households" h
WHERE ts."household_id" = h."id"
  AND (ts."usual_treatment_cost_currency_for_import" IS NULL OR btrim(ts."usual_treatment_cost_currency_for_import") = '');
