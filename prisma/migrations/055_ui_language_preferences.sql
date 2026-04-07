-- Household-level default UI language + optional user override.
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS ui_language TEXT NOT NULL DEFAULT 'en';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ui_language TEXT NULL;
