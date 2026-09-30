-- Each clinic user has their own Make token. Client matching uses that user's family member.
-- Replaces the household-wide token from 145.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS treatment_intake_token_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS treatment_intake_token_last4 TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_treatment_intake_token_hash_key
  ON users (treatment_intake_token_hash);

DROP INDEX IF EXISTS therapy_settings_treatment_intake_token_hash_key;

ALTER TABLE therapy_settings
  DROP COLUMN IF EXISTS treatment_intake_token_hash,
  DROP COLUMN IF EXISTS treatment_intake_token_last4;
