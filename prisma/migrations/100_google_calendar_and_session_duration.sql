-- Google Calendar one-way integration fields and default session duration scaffolding.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_calendar_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS google_gmail_address TEXT NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_access_token_encrypted TEXT NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_refresh_token_encrypted TEXT NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_token_expires_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_token_scope TEXT NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_sync_error TEXT NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_sync_error_at TIMESTAMPTZ NULL;

ALTER TABLE therapy_settings
  ADD COLUMN IF NOT EXISTS default_session_length_minutes INTEGER NULL;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS default_session_length_minutes INTEGER NULL;

ALTER TABLE therapy_service_programs
  ADD COLUMN IF NOT EXISTS default_session_length_minutes INTEGER NULL;

ALTER TABLE therapy_appointments
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_last_synced_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_last_error TEXT NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_last_error_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_therapy_appointments_google_calendar_event_id
  ON therapy_appointments(google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;
