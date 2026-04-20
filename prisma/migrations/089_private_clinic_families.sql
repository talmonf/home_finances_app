-- Private clinic families: all entity IDs and household_id columns are uuid (matches households.id, therapy_*).
-- Prisma db push maps String fields to text by default; those FKs fail against uuid households.id. Drop mistyped tables only.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_families' AND column_name = 'household_id'
      AND data_type IN ('text', 'character varying')
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_family_members' AND column_name = 'household_id'
      AND data_type IN ('text', 'character varying')
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_appointment_participants' AND column_name = 'household_id'
      AND data_type IN ('text', 'character varying')
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_treatment_participants' AND column_name = 'household_id'
      AND data_type IN ('text', 'character varying')
  ) THEN
    DROP TABLE IF EXISTS therapy_treatment_participants CASCADE;
    DROP TABLE IF EXISTS therapy_appointment_participants CASCADE;
    DROP TABLE IF EXISTS therapy_family_members CASCADE;
    DROP TABLE IF EXISTS therapy_families CASCADE;
  END IF;
END $$;

-- therapy_families gone but family_id may remain on clients (CASCADE dropped FK only); remove so ALTER can re-add with FK.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'therapy_families') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = 'therapy_clients' AND c.column_name = 'family_id'
    ) THEN
      ALTER TABLE therapy_clients DROP COLUMN family_id;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = 'therapy_treatments' AND c.column_name = 'family_id'
    ) THEN
      ALTER TABLE therapy_treatments DROP COLUMN family_id;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = 'therapy_receipts' AND c.column_name = 'family_id'
    ) THEN
      ALTER TABLE therapy_receipts DROP COLUMN family_id;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = 'therapy_appointments' AND c.column_name = 'family_id'
    ) THEN
      ALTER TABLE therapy_appointments DROP COLUMN family_id;
    END IF;
  END IF;
END $$;

-- If mistyped columns were added without a successful migration, drop them so we can re-add as uuid / enums.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'therapy_clients' AND c.column_name = 'family_id'
      AND c.data_type <> 'uuid'
  ) THEN
    ALTER TABLE therapy_clients DROP COLUMN family_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'therapy_treatments' AND c.column_name = 'family_id'
      AND c.data_type <> 'uuid'
  ) THEN
    ALTER TABLE therapy_treatments DROP COLUMN family_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'therapy_receipts' AND c.column_name = 'family_id'
      AND c.data_type <> 'uuid'
  ) THEN
    ALTER TABLE therapy_receipts DROP COLUMN family_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'therapy_appointments' AND c.column_name = 'family_id'
      AND c.data_type <> 'uuid'
  ) THEN
    ALTER TABLE therapy_appointments DROP COLUMN family_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'therapy_clients' AND c.column_name = 'billing_basis'
      AND c.udt_name <> 'therapy_billing_basis'
  ) THEN
    ALTER TABLE therapy_clients DROP COLUMN billing_basis;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'therapy_clients' AND c.column_name = 'billing_timing'
      AND c.udt_name <> 'therapy_billing_timing'
  ) THEN
    ALTER TABLE therapy_clients DROP COLUMN billing_timing;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_billing_basis') THEN
    CREATE TYPE therapy_billing_basis AS ENUM ('per_treatment', 'per_month');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_billing_timing') THEN
    CREATE TYPE therapy_billing_timing AS ENUM ('in_advance', 'in_arrears');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS therapy_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  main_family_member_id uuid NOT NULL REFERENCES therapy_clients(id) ON DELETE RESTRICT,
  billing_basis therapy_billing_basis,
  billing_timing therapy_billing_timing,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS therapy_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES therapy_families(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES therapy_clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, client_id)
);

CREATE TABLE IF NOT EXISTS therapy_appointment_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES therapy_appointments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES therapy_clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, client_id)
);

CREATE TABLE IF NOT EXISTS therapy_treatment_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  treatment_id uuid NOT NULL REFERENCES therapy_treatments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES therapy_clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (treatment_id, client_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_settings' AND column_name = 'family_therapy_enabled'
  ) THEN
    ALTER TABLE therapy_settings
      ADD COLUMN family_therapy_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_clients' AND column_name = 'family_id'
  ) THEN
    ALTER TABLE therapy_clients
      ADD COLUMN family_id uuid REFERENCES therapy_families(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_clients' AND column_name = 'billing_basis'
  ) THEN
    ALTER TABLE therapy_clients
      ADD COLUMN billing_basis therapy_billing_basis;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_clients' AND column_name = 'billing_timing'
  ) THEN
    ALTER TABLE therapy_clients
      ADD COLUMN billing_timing therapy_billing_timing;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_treatments' AND column_name = 'family_id'
  ) THEN
    ALTER TABLE therapy_treatments
      ADD COLUMN family_id uuid REFERENCES therapy_families(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_receipts' AND column_name = 'family_id'
  ) THEN
    ALTER TABLE therapy_receipts
      ADD COLUMN family_id uuid REFERENCES therapy_families(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_appointments' AND column_name = 'family_id'
  ) THEN
    ALTER TABLE therapy_appointments
      ADD COLUMN family_id uuid REFERENCES therapy_families(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_appointments' AND column_name = 'reschedule_reason'
  ) THEN
    ALTER TABLE therapy_appointments
      ADD COLUMN reschedule_reason TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'therapy_appointments' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE therapy_appointments
      ADD COLUMN cancellation_reason TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS therapy_families_household_name_idx ON therapy_families(household_id, name);
CREATE INDEX IF NOT EXISTS therapy_family_members_household_family_idx ON therapy_family_members(household_id, family_id);
CREATE INDEX IF NOT EXISTS therapy_appointment_participants_household_appointment_idx ON therapy_appointment_participants(household_id, appointment_id);
CREATE INDEX IF NOT EXISTS therapy_treatment_participants_household_treatment_idx ON therapy_treatment_participants(household_id, treatment_id);
CREATE INDEX IF NOT EXISTS therapy_clients_family_id_idx ON therapy_clients(family_id);
CREATE INDEX IF NOT EXISTS therapy_treatments_family_id_idx ON therapy_treatments(family_id);
CREATE INDEX IF NOT EXISTS therapy_receipts_family_id_idx ON therapy_receipts(family_id);
CREATE INDEX IF NOT EXISTS therapy_appointments_family_id_idx ON therapy_appointments(family_id);

UPDATE therapy_treatments t
SET family_id = c.family_id
FROM therapy_clients c
WHERE c.id = t.client_id
  AND c.family_id IS NOT NULL;

UPDATE therapy_receipts r
SET family_id = c.family_id
FROM therapy_clients c
WHERE c.id = r.client_id
  AND c.family_id IS NOT NULL;
