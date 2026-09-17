-- One-way Google Calendar sync for household birthdays, anniversaries, and special dates.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_calendar_sync_family_dates BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS family_calendar_sync_error TEXT NULL,
  ADD COLUMN IF NOT EXISTS family_calendar_sync_error_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS family_calendar_sync_failure_notified_at TIMESTAMPTZ NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'family_calendar_source_kind') THEN
    CREATE TYPE family_calendar_source_kind AS ENUM ('birthday', 'anniversary', 'special_date');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'family_calendar_kind') THEN
    CREATE TYPE family_calendar_kind AS ENUM ('gregorian', 'hebrew');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS family_calendar_sync_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id         UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_kind          family_calendar_source_kind NOT NULL,
  source_id            UUID NOT NULL,
  calendar_kind        family_calendar_kind NOT NULL,
  occurrence_key       TEXT NOT NULL,
  google_event_id      TEXT NULL,
  last_synced_at       TIMESTAMPTZ NULL,
  last_error           TEXT NULL,
  last_error_at        TIMESTAMPTZ NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT family_calendar_sync_events_user_source_key UNIQUE
    (user_id, source_kind, source_id, calendar_kind, occurrence_key)
);

CREATE INDEX IF NOT EXISTS family_calendar_sync_events_household_id_idx
  ON family_calendar_sync_events (household_id);
CREATE INDEX IF NOT EXISTS family_calendar_sync_events_user_id_idx
  ON family_calendar_sync_events (user_id);
CREATE INDEX IF NOT EXISTS family_calendar_sync_events_google_event_id_idx
  ON family_calendar_sync_events (google_event_id)
  WHERE google_event_id IS NOT NULL;
