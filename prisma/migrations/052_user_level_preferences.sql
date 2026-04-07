-- User-level preference overrides:
-- 1) Optional date display format per user (falls back to household when null)
-- 2) Optional per-user enabled/disabled dashboard sections

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS date_display_format household_date_display_format NULL;

CREATE TABLE IF NOT EXISTS user_enabled_sections (
  id TEXT PRIMARY KEY,
  household_id UUID NOT NULL,
  user_id UUID NOT NULL,
  section_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_enabled_sections'
      AND column_name = 'household_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE user_enabled_sections
      ALTER COLUMN household_id TYPE UUID USING household_id::uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_enabled_sections'
      AND column_name = 'user_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE user_enabled_sections
      ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_enabled_sections_user
  ON user_enabled_sections(user_id);

CREATE INDEX IF NOT EXISTS idx_user_enabled_sections_household
  ON user_enabled_sections(household_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_enabled_sections_unique
  ON user_enabled_sections(user_id, section_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_enabled_sections_household_id_fkey'
  ) THEN
    ALTER TABLE user_enabled_sections
      ADD CONSTRAINT user_enabled_sections_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_enabled_sections_user_id_fkey'
  ) THEN
    ALTER TABLE user_enabled_sections
      ADD CONSTRAINT user_enabled_sections_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
