-- Dated, repeatable on-hold intervals for therapy clients (hospital stays, return hospitalizations, etc.).
-- Keep therapy_clients.on_hold as a derived cache of “currently on hold”.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_client_hold_reason') THEN
    CREATE TYPE therapy_client_hold_reason AS ENUM (
      'hospital',
      'other'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS therapy_client_hold_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES therapy_clients(id) ON DELETE CASCADE,
  started_on    DATE NOT NULL,
  ended_on      DATE,
  reason        therapy_client_hold_reason,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT therapy_client_hold_periods_dates_chk CHECK (ended_on IS NULL OR ended_on >= started_on)
);

CREATE INDEX IF NOT EXISTS therapy_client_hold_periods_household_client_idx
  ON therapy_client_hold_periods (household_id, client_id);

-- Backfill: current on-hold clients get one open period starting today (do not invent history).
INSERT INTO therapy_client_hold_periods (id, household_id, client_id, started_on, notes)
SELECT gen_random_uuid(), c.household_id, c.id, CURRENT_DATE, 'Migrated from on-hold checkbox'
FROM therapy_clients c
WHERE c.on_hold = true
  AND NOT EXISTS (
    SELECT 1 FROM therapy_client_hold_periods p WHERE p.client_id = c.id
  );
