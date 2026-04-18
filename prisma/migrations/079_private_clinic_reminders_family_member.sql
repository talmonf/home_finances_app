-- Manual private-clinic reminders: scope to a family member (practitioner), not the whole household.

ALTER TABLE private_clinic_reminders
  ADD COLUMN IF NOT EXISTS family_member_id UUID;

-- Backfill: attach each legacy row to the household's first active family member (by created_at).
UPDATE private_clinic_reminders r
SET family_member_id = (
  SELECT fm.id
  FROM family_members fm
  WHERE fm.household_id = r.household_id AND fm.is_active = true
  ORDER BY fm.created_at ASC NULLS LAST
  LIMIT 1
)
WHERE r.family_member_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_private_clinic_reminders_household_family_reminder_date
  ON private_clinic_reminders (household_id, family_member_id, reminder_date);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'private_clinic_reminders_family_member_id_fkey'
  ) THEN
    ALTER TABLE private_clinic_reminders
      ADD CONSTRAINT private_clinic_reminders_family_member_id_fkey
      FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE;
  END IF;
END $$;
