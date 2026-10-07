-- Schedule consultations, then report them. Existing rows stay completed payable logs.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_consultation_status') THEN
    CREATE TYPE therapy_consultation_status AS ENUM ('scheduled', 'cancelled', 'completed');
  END IF;
END $$;

ALTER TABLE therapy_consultations
  ADD COLUMN IF NOT EXISTS status therapy_consultation_status NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_last_synced_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_last_error TEXT NULL,
  ADD COLUMN IF NOT EXISTS google_calendar_last_error_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS therapy_consultations_household_status_occurred_idx
  ON therapy_consultations (household_id, status, occurred_at);

CREATE INDEX IF NOT EXISTS idx_therapy_consultations_google_calendar_event_id
  ON therapy_consultations (google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;
