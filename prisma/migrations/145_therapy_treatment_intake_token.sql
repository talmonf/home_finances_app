-- Bearer token for the Google Form / Make treatment intake webhook.
-- The full token is shown once in Clinic settings; only a hash and the last 4 characters are stored.

ALTER TABLE therapy_settings
  ADD COLUMN IF NOT EXISTS treatment_intake_token_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS treatment_intake_token_last4 TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS therapy_settings_treatment_intake_token_hash_key
  ON therapy_settings (treatment_intake_token_hash);

-- Retries from Make must not create a second treatment for the same Google Form response.
CREATE UNIQUE INDEX IF NOT EXISTS therapy_treatments_household_gform_import_key_uidx
  ON therapy_treatments (household_id, import_key)
  WHERE import_key IS NOT NULL AND import_key LIKE 'gform:%';
