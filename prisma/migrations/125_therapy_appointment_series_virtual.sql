-- Virtual recurrence: series exceptions, series duration/google fields, occurrence_date on appointments.

CREATE TABLE IF NOT EXISTS therapy_appointment_series_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES therapy_appointment_series(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  kind TEXT NOT NULL DEFAULT 'skip',
  appointment_id UUID NULL REFERENCES therapy_appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (series_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS therapy_appointment_series_exceptions_household_series_idx
  ON therapy_appointment_series_exceptions (household_id, series_id);

ALTER TABLE therapy_appointment_series
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_calendar_last_error TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_last_error_at TIMESTAMPTZ;

ALTER TABLE therapy_appointments
  ADD COLUMN IF NOT EXISTS occurrence_date DATE;

-- Remove bulk future scheduled rows for series; virtual expansion replaces them.
DELETE FROM therapy_appointments
WHERE series_id IS NOT NULL
  AND status = 'scheduled'
  AND start_at >= now();
