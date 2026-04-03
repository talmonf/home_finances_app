-- 039_household_section_statuses.sql
-- Per-household manual "Done" tracking per dashboard section

CREATE TABLE IF NOT EXISTS household_section_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  section_id TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_household_section_statuses_household
  ON household_section_statuses(household_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_household_section_statuses_unique
  ON household_section_statuses(household_id, section_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'household_section_statuses_household_id_fkey'
  ) THEN
    ALTER TABLE household_section_statuses
      ADD CONSTRAINT household_section_statuses_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
END $$;

