-- 038_household_enabled_sections.sql
-- Per-household dashboard section enable/disable configuration

CREATE TABLE IF NOT EXISTS household_enabled_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  section_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_household_enabled_sections_household
  ON household_enabled_sections(household_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_household_enabled_sections_unique
  ON household_enabled_sections(household_id, section_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'household_enabled_sections_household_id_fkey'
  ) THEN
    ALTER TABLE household_enabled_sections
      ADD CONSTRAINT household_enabled_sections_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
END $$;

