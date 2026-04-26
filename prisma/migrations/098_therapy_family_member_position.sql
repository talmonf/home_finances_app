-- Optional role in the family unit (father/mother/son/daughter) per membership row.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_family_member_position') THEN
    CREATE TYPE therapy_family_member_position AS ENUM ('father', 'mother', 'son', 'daughter');
  END IF;
END $$;

ALTER TABLE therapy_family_members
  ADD COLUMN IF NOT EXISTS member_position therapy_family_member_position NULL;
