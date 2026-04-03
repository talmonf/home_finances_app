-- Private clinic / therapist: extend job employment type + therapy tables.

-- 1) Extend job_employment_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'job_employment_type' AND e.enumlabel = 'self_employed'
  ) THEN
    ALTER TYPE job_employment_type ADD VALUE 'self_employed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'job_employment_type' AND e.enumlabel = 'contractor_via_company'
  ) THEN
    ALTER TYPE job_employment_type ADD VALUE 'contractor_via_company';
  END IF;
END $$;

-- 2) Therapy enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_visit_type') THEN
    CREATE TYPE therapy_visit_type AS ENUM ('clinic', 'home', 'phone', 'video');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_receipt_recipient_type') THEN
    CREATE TYPE therapy_receipt_recipient_type AS ENUM ('organization', 'client');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_receipt_payment_method') THEN
    CREATE TYPE therapy_receipt_payment_method AS ENUM ('cash', 'bank_transfer', 'digital_card', 'credit_card');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_appointment_status') THEN
    CREATE TYPE therapy_appointment_status AS ENUM ('scheduled', 'cancelled', 'completed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_appointment_recurrence') THEN
    CREATE TYPE therapy_appointment_recurrence AS ENUM ('weekly', 'biweekly');
  END IF;
END $$;

-- 3) therapy_settings (one per household)
CREATE TABLE IF NOT EXISTS therapy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  note_1_label TEXT NOT NULL DEFAULT 'Note 1',
  note_2_label TEXT NOT NULL DEFAULT 'Note 2',
  note_3_label TEXT NOT NULL DEFAULT 'Note 3',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT therapy_settings_household_id_key UNIQUE (household_id)
);

CREATE INDEX IF NOT EXISTS idx_therapy_settings_household ON therapy_settings(household_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_settings_household_id_fkey') THEN
    ALTER TABLE therapy_settings
      ADD CONSTRAINT therapy_settings_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4) therapy_expense_categories
CREATE TABLE IF NOT EXISTS therapy_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapy_expense_categories_household ON therapy_expense_categories(household_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_expense_categories_household_id_fkey') THEN
    ALTER TABLE therapy_expense_categories
      ADD CONSTRAINT therapy_expense_categories_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS therapy_expense_categories_household_name_key
  ON therapy_expense_categories (household_id, name);

-- 5) therapy_service_programs (per job)
CREATE TABLE IF NOT EXISTS therapy_service_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  job_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapy_programs_household ON therapy_service_programs(household_id);
CREATE INDEX IF NOT EXISTS idx_therapy_programs_job ON therapy_service_programs(job_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_service_programs_household_id_fkey') THEN
    ALTER TABLE therapy_service_programs
      ADD CONSTRAINT therapy_service_programs_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_service_programs_job_id_fkey') THEN
    ALTER TABLE therapy_service_programs
      ADD CONSTRAINT therapy_service_programs_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6) therapy_clients
CREATE TABLE IF NOT EXISTS therapy_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  id_number TEXT,
  start_date DATE,
  notes TEXT,
  default_job_id UUID NOT NULL,
  default_program_id UUID NOT NULL,
  email TEXT,
  phones TEXT,
  address TEXT,
  import_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapy_clients_household ON therapy_clients(household_id);
CREATE INDEX IF NOT EXISTS idx_therapy_clients_default_job ON therapy_clients(default_job_id);
CREATE INDEX IF NOT EXISTS idx_therapy_clients_import_key ON therapy_clients(household_id, import_key) WHERE import_key IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_clients_household_id_fkey') THEN
    ALTER TABLE therapy_clients
      ADD CONSTRAINT therapy_clients_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_clients_default_job_id_fkey') THEN
    ALTER TABLE therapy_clients
      ADD CONSTRAINT therapy_clients_default_job_id_fkey
      FOREIGN KEY (default_job_id) REFERENCES jobs(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_clients_default_program_id_fkey') THEN
    ALTER TABLE therapy_clients
      ADD CONSTRAINT therapy_clients_default_program_id_fkey
      FOREIGN KEY (default_program_id) REFERENCES therapy_service_programs(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 7) therapy_clients_jobs (M2M)
CREATE TABLE IF NOT EXISTS therapy_clients_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  client_id UUID NOT NULL,
  job_id UUID NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT therapy_clients_jobs_client_job_key UNIQUE (client_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_therapy_clients_jobs_household ON therapy_clients_jobs(household_id);
CREATE INDEX IF NOT EXISTS idx_therapy_clients_jobs_client ON therapy_clients_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_therapy_clients_jobs_job ON therapy_clients_jobs(job_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_clients_jobs_household_id_fkey') THEN
    ALTER TABLE therapy_clients_jobs
      ADD CONSTRAINT therapy_clients_jobs_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_clients_jobs_client_id_fkey') THEN
    ALTER TABLE therapy_clients_jobs
      ADD CONSTRAINT therapy_clients_jobs_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES therapy_clients(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_clients_jobs_job_id_fkey') THEN
    ALTER TABLE therapy_clients_jobs
      ADD CONSTRAINT therapy_clients_jobs_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 8) therapy_treatments
CREATE TABLE IF NOT EXISTS therapy_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  client_id UUID NOT NULL,
  job_id UUID NOT NULL,
  program_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  visit_type therapy_visit_type NOT NULL,
  note_1 TEXT,
  note_2 TEXT,
  note_3 TEXT,
  linked_transaction_id UUID,
  import_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapy_treatments_household ON therapy_treatments(household_id);
CREATE INDEX IF NOT EXISTS idx_therapy_treatments_household_job ON therapy_treatments(household_id, job_id);
CREATE INDEX IF NOT EXISTS idx_therapy_treatments_household_occurred ON therapy_treatments(household_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_therapy_treatments_client ON therapy_treatments(client_id);
CREATE INDEX IF NOT EXISTS idx_therapy_treatments_program ON therapy_treatments(program_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_therapy_treatments_import_key ON therapy_treatments(household_id, import_key) WHERE import_key IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_treatments_household_id_fkey') THEN
    ALTER TABLE therapy_treatments
      ADD CONSTRAINT therapy_treatments_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_treatments_client_id_fkey') THEN
    ALTER TABLE therapy_treatments
      ADD CONSTRAINT therapy_treatments_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES therapy_clients(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_treatments_job_id_fkey') THEN
    ALTER TABLE therapy_treatments
      ADD CONSTRAINT therapy_treatments_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_treatments_program_id_fkey') THEN
    ALTER TABLE therapy_treatments
      ADD CONSTRAINT therapy_treatments_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES therapy_service_programs(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_treatments_linked_transaction_id_fkey') THEN
    ALTER TABLE therapy_treatments
      ADD CONSTRAINT therapy_treatments_linked_transaction_id_fkey
      FOREIGN KEY (linked_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 9) therapy_receipts
CREATE TABLE IF NOT EXISTS therapy_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  job_id UUID NOT NULL,
  receipt_number TEXT NOT NULL,
  issued_at DATE NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  recipient_type therapy_receipt_recipient_type NOT NULL,
  payment_method therapy_receipt_payment_method NOT NULL,
  notes TEXT,
  linked_transaction_id UUID,
  import_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapy_receipts_household ON therapy_receipts(household_id);
CREATE INDEX IF NOT EXISTS idx_therapy_receipts_job ON therapy_receipts(job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_therapy_receipts_number_per_year ON therapy_receipts (household_id, receipt_number, (EXTRACT(YEAR FROM issued_at::timestamp)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_therapy_receipts_import_key ON therapy_receipts(household_id, import_key) WHERE import_key IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_receipts_household_id_fkey') THEN
    ALTER TABLE therapy_receipts
      ADD CONSTRAINT therapy_receipts_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_receipts_job_id_fkey') THEN
    ALTER TABLE therapy_receipts
      ADD CONSTRAINT therapy_receipts_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_receipts_linked_transaction_id_fkey') THEN
    ALTER TABLE therapy_receipts
      ADD CONSTRAINT therapy_receipts_linked_transaction_id_fkey
      FOREIGN KEY (linked_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 10) therapy_receipt_allocations
CREATE TABLE IF NOT EXISTS therapy_receipt_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  receipt_id UUID NOT NULL,
  treatment_id UUID NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT therapy_receipt_allocations_receipt_treatment_key UNIQUE (receipt_id, treatment_id)
);

CREATE INDEX IF NOT EXISTS idx_therapy_receipt_allocations_household ON therapy_receipt_allocations(household_id);
CREATE INDEX IF NOT EXISTS idx_therapy_receipt_allocations_receipt ON therapy_receipt_allocations(receipt_id);
CREATE INDEX IF NOT EXISTS idx_therapy_receipt_allocations_treatment ON therapy_receipt_allocations(treatment_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_receipt_allocations_household_id_fkey') THEN
    ALTER TABLE therapy_receipt_allocations
      ADD CONSTRAINT therapy_receipt_allocations_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_receipt_allocations_receipt_id_fkey') THEN
    ALTER TABLE therapy_receipt_allocations
      ADD CONSTRAINT therapy_receipt_allocations_receipt_id_fkey
      FOREIGN KEY (receipt_id) REFERENCES therapy_receipts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_receipt_allocations_treatment_id_fkey') THEN
    ALTER TABLE therapy_receipt_allocations
      ADD CONSTRAINT therapy_receipt_allocations_treatment_id_fkey
      FOREIGN KEY (treatment_id) REFERENCES therapy_treatments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 11) therapy_job_expenses
CREATE TABLE IF NOT EXISTS therapy_job_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  job_id UUID NOT NULL,
  category_id UUID NOT NULL,
  expense_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  notes TEXT,
  image_file_name TEXT,
  image_mime_type TEXT,
  image_storage_bucket TEXT,
  image_storage_key TEXT,
  image_storage_url TEXT,
  linked_transaction_id UUID,
  import_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapy_job_expenses_household ON therapy_job_expenses(household_id);
CREATE INDEX IF NOT EXISTS idx_therapy_job_expenses_household_job ON therapy_job_expenses(household_id, job_id);
CREATE INDEX IF NOT EXISTS idx_therapy_job_expenses_date ON therapy_job_expenses(household_id, expense_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_therapy_job_expenses_import_key ON therapy_job_expenses(household_id, import_key) WHERE import_key IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_job_expenses_household_id_fkey') THEN
    ALTER TABLE therapy_job_expenses
      ADD CONSTRAINT therapy_job_expenses_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_job_expenses_job_id_fkey') THEN
    ALTER TABLE therapy_job_expenses
      ADD CONSTRAINT therapy_job_expenses_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_job_expenses_category_id_fkey') THEN
    ALTER TABLE therapy_job_expenses
      ADD CONSTRAINT therapy_job_expenses_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES therapy_expense_categories(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_job_expenses_linked_transaction_id_fkey') THEN
    ALTER TABLE therapy_job_expenses
      ADD CONSTRAINT therapy_job_expenses_linked_transaction_id_fkey
      FOREIGN KEY (linked_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 12) therapy_appointment_series
CREATE TABLE IF NOT EXISTS therapy_appointment_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  client_id UUID NOT NULL,
  job_id UUID NOT NULL,
  program_id UUID,
  visit_type therapy_visit_type NOT NULL,
  recurrence therapy_appointment_recurrence NOT NULL,
  day_of_week SMALLINT NOT NULL,
  time_of_day TIME NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT therapy_appointment_series_day_check CHECK (day_of_week >= 0 AND day_of_week <= 6)
);

CREATE INDEX IF NOT EXISTS idx_therapy_appointment_series_household ON therapy_appointment_series(household_id);
CREATE INDEX IF NOT EXISTS idx_therapy_appointment_series_client ON therapy_appointment_series(client_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_appointment_series_household_id_fkey') THEN
    ALTER TABLE therapy_appointment_series
      ADD CONSTRAINT therapy_appointment_series_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_appointment_series_client_id_fkey') THEN
    ALTER TABLE therapy_appointment_series
      ADD CONSTRAINT therapy_appointment_series_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES therapy_clients(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_appointment_series_job_id_fkey') THEN
    ALTER TABLE therapy_appointment_series
      ADD CONSTRAINT therapy_appointment_series_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_appointment_series_program_id_fkey') THEN
    ALTER TABLE therapy_appointment_series
      ADD CONSTRAINT therapy_appointment_series_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES therapy_service_programs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 13) therapy_appointments
CREATE TABLE IF NOT EXISTS therapy_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  client_id UUID NOT NULL,
  job_id UUID NOT NULL,
  program_id UUID,
  series_id UUID,
  visit_type therapy_visit_type NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  status therapy_appointment_status NOT NULL DEFAULT 'scheduled',
  treatment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapy_appointments_household ON therapy_appointments(household_id);
CREATE INDEX IF NOT EXISTS idx_therapy_appointments_household_start ON therapy_appointments(household_id, start_at);
CREATE INDEX IF NOT EXISTS idx_therapy_appointments_client ON therapy_appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_therapy_appointments_series ON therapy_appointments(series_id) WHERE series_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_appointments_household_id_fkey') THEN
    ALTER TABLE therapy_appointments
      ADD CONSTRAINT therapy_appointments_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_appointments_client_id_fkey') THEN
    ALTER TABLE therapy_appointments
      ADD CONSTRAINT therapy_appointments_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES therapy_clients(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_appointments_job_id_fkey') THEN
    ALTER TABLE therapy_appointments
      ADD CONSTRAINT therapy_appointments_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_appointments_program_id_fkey') THEN
    ALTER TABLE therapy_appointments
      ADD CONSTRAINT therapy_appointments_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES therapy_service_programs(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_appointments_series_id_fkey') THEN
    ALTER TABLE therapy_appointments
      ADD CONSTRAINT therapy_appointments_series_id_fkey
      FOREIGN KEY (series_id) REFERENCES therapy_appointment_series(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_appointments_treatment_id_fkey') THEN
    ALTER TABLE therapy_appointments
      ADD CONSTRAINT therapy_appointments_treatment_id_fkey
      FOREIGN KEY (treatment_id) REFERENCES therapy_treatments(id) ON DELETE SET NULL;
  END IF;
END $$;
