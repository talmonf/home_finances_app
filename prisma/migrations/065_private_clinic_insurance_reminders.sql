-- Private clinic: clinic insurance types, contact fields; client end date; clinic lease flag; manual reminders.

-- 1) insurance_policy_type enum values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'insurance_policy_type' AND e.enumlabel = 'professional_liability'
  ) THEN
    ALTER TYPE insurance_policy_type ADD VALUE 'professional_liability';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'insurance_policy_type' AND e.enumlabel = 'clinic_premises'
  ) THEN
    ALTER TYPE insurance_policy_type ADD VALUE 'clinic_premises';
  END IF;
END $$;

-- 2) insurance_policies contact + website
ALTER TABLE insurance_policies
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

ALTER TABLE insurance_policies
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

ALTER TABLE insurance_policies
  ADD COLUMN IF NOT EXISTS website_url TEXT;

-- 3) therapy_clients optional end date (treatment / engagement end)
ALTER TABLE therapy_clients
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- 4) rentals: mark clinic lease for reminder scope
ALTER TABLE rentals
  ADD COLUMN IF NOT EXISTS is_clinic_lease BOOLEAN NOT NULL DEFAULT false;

-- 5) manual reminders (private clinic module)
CREATE TABLE IF NOT EXISTS private_clinic_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  reminder_date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT private_clinic_reminders_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_private_clinic_reminders_household_reminder_date
  ON private_clinic_reminders (household_id, reminder_date);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'private_clinic_reminders_household_id_fkey'
  ) THEN
    ALTER TABLE private_clinic_reminders
      ADD CONSTRAINT private_clinic_reminders_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
