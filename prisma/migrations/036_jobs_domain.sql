-- 036_jobs_domain.sql
-- Jobs domain: jobs, benefits, payroll entries, documents

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_employment_type') THEN
    CREATE TYPE job_employment_type AS ENUM ('freelancer', 'employee');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_payroll_period_type') THEN
    CREATE TYPE job_payroll_period_type AS ENUM ('monthly', 'biweekly', 'weekly', 'annual', 'other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  family_member_id UUID NOT NULL,
  employment_type job_employment_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  job_title TEXT NOT NULL,
  employer_name TEXT NULL,
  employer_tax_number TEXT NULL,
  employer_address TEXT NULL,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_household ON jobs(household_id);
CREATE INDEX IF NOT EXISTS idx_jobs_family_member ON jobs(family_member_id);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_end_date ON jobs(end_date);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'jobs_household_id_fkey'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'jobs_family_member_id_fkey'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_family_member_id_fkey
      FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS job_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  job_id UUID NOT NULL,
  benefit_type TEXT NOT NULL,
  transfer_destination TEXT NULL,
  provider_name TEXT NULL,
  policy_number TEXT NULL,
  terms TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_benefits_household ON job_benefits(household_id);
CREATE INDEX IF NOT EXISTS idx_job_benefits_job ON job_benefits(job_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_benefits_household_id_fkey'
  ) THEN
    ALTER TABLE job_benefits
      ADD CONSTRAINT job_benefits_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_benefits_job_id_fkey'
  ) THEN
    ALTER TABLE job_benefits
      ADD CONSTRAINT job_benefits_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS job_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  job_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NULL,
  storage_bucket TEXT NULL,
  storage_key TEXT NOT NULL,
  storage_url TEXT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_documents_household ON job_documents(household_id);
CREATE INDEX IF NOT EXISTS idx_job_documents_job ON job_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_job_documents_uploaded_at ON job_documents(uploaded_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_documents_household_id_fkey'
  ) THEN
    ALTER TABLE job_documents
      ADD CONSTRAINT job_documents_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_documents_job_id_fkey'
  ) THEN
    ALTER TABLE job_documents
      ADD CONSTRAINT job_documents_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS job_payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  job_id UUID NOT NULL,
  effective_date DATE NOT NULL,
  pay_period_start DATE NULL,
  pay_period_end DATE NULL,
  period_type job_payroll_period_type NOT NULL DEFAULT 'monthly',
  currency TEXT NOT NULL DEFAULT 'ILS',
  gross_amount NUMERIC(15,2) NULL,
  net_amount NUMERIC(15,2) NULL,
  employee_deductions NUMERIC(15,2) NULL,
  employer_contributions NUMERIC(15,2) NULL,
  bonus_amount NUMERIC(15,2) NULL,
  equity_amount NUMERIC(15,2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_payroll_entries_household ON job_payroll_entries(household_id);
CREATE INDEX IF NOT EXISTS idx_job_payroll_entries_job ON job_payroll_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_job_payroll_entries_effective_date ON job_payroll_entries(effective_date);
CREATE INDEX IF NOT EXISTS idx_job_payroll_entries_pay_period_start ON job_payroll_entries(pay_period_start);
CREATE INDEX IF NOT EXISTS idx_job_payroll_entries_pay_period_end ON job_payroll_entries(pay_period_end);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_payroll_entries_household_id_fkey'
  ) THEN
    ALTER TABLE job_payroll_entries
      ADD CONSTRAINT job_payroll_entries_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_payroll_entries_job_id_fkey'
  ) THEN
    ALTER TABLE job_payroll_entries
      ADD CONSTRAINT job_payroll_entries_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
END $$;
