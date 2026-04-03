-- Consultation types (household-defined), consultations/meetings, travel entries.

CREATE TABLE IF NOT EXISTS therapy_consultation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapy_consultation_types_household ON therapy_consultation_types(household_id);

CREATE UNIQUE INDEX IF NOT EXISTS therapy_consultation_types_household_name_key
  ON therapy_consultation_types (household_id, name);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_consultation_types_household_id_fkey') THEN
    ALTER TABLE therapy_consultation_types
      ADD CONSTRAINT therapy_consultation_types_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS therapy_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  job_id UUID NOT NULL,
  consultation_type_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  income_amount DECIMAL(15, 2),
  income_currency TEXT NOT NULL DEFAULT 'ILS',
  cost_amount DECIMAL(15, 2),
  cost_currency TEXT NOT NULL DEFAULT 'ILS',
  notes TEXT,
  linked_income_transaction_id UUID,
  linked_cost_transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapy_consultations_household ON therapy_consultations(household_id);
CREATE INDEX IF NOT EXISTS idx_therapy_consultations_household_job ON therapy_consultations(household_id, job_id);
CREATE INDEX IF NOT EXISTS idx_therapy_consultations_occurred ON therapy_consultations(household_id, occurred_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_consultations_household_id_fkey') THEN
    ALTER TABLE therapy_consultations
      ADD CONSTRAINT therapy_consultations_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_consultations_job_id_fkey') THEN
    ALTER TABLE therapy_consultations
      ADD CONSTRAINT therapy_consultations_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_consultations_consultation_type_id_fkey') THEN
    ALTER TABLE therapy_consultations
      ADD CONSTRAINT therapy_consultations_consultation_type_id_fkey
      FOREIGN KEY (consultation_type_id) REFERENCES therapy_consultation_types(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_consultations_linked_income_tx_fkey') THEN
    ALTER TABLE therapy_consultations
      ADD CONSTRAINT therapy_consultations_linked_income_tx_fkey
      FOREIGN KEY (linked_income_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_consultations_linked_cost_tx_fkey') THEN
    ALTER TABLE therapy_consultations
      ADD CONSTRAINT therapy_consultations_linked_cost_tx_fkey
      FOREIGN KEY (linked_cost_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS therapy_travel_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  job_id UUID,
  treatment_id UUID,
  occurred_at TIMESTAMPTZ,
  notes TEXT,
  amount DECIMAL(15, 2),
  currency TEXT NOT NULL DEFAULT 'ILS',
  linked_transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT therapy_travel_job_or_treatment_check CHECK (
    (job_id IS NOT NULL AND treatment_id IS NULL) OR (job_id IS NULL AND treatment_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_therapy_travel_household ON therapy_travel_entries(household_id);
CREATE INDEX IF NOT EXISTS idx_therapy_travel_treatment ON therapy_travel_entries(treatment_id) WHERE treatment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_therapy_travel_job ON therapy_travel_entries(job_id) WHERE job_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_travel_entries_household_id_fkey') THEN
    ALTER TABLE therapy_travel_entries
      ADD CONSTRAINT therapy_travel_entries_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_travel_entries_job_id_fkey') THEN
    ALTER TABLE therapy_travel_entries
      ADD CONSTRAINT therapy_travel_entries_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_travel_entries_treatment_id_fkey') THEN
    ALTER TABLE therapy_travel_entries
      ADD CONSTRAINT therapy_travel_entries_treatment_id_fkey
      FOREIGN KEY (treatment_id) REFERENCES therapy_treatments(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_travel_entries_linked_tx_fkey') THEN
    ALTER TABLE therapy_travel_entries
      ADD CONSTRAINT therapy_travel_entries_linked_tx_fkey
      FOREIGN KEY (linked_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
  END IF;
END $$;
