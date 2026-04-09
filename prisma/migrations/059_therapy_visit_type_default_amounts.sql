-- Default session fee per visit type at job scope (program_id NULL) or program scope (program_id set).

CREATE TABLE IF NOT EXISTS therapy_visit_type_default_amounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  job_id UUID NOT NULL,
  program_id UUID,
  visit_type therapy_visit_type NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT therapy_vt_def_amt_household_fkey FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  CONSTRAINT therapy_vt_def_amt_job_fkey FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT therapy_vt_def_amt_program_fkey FOREIGN KEY (program_id) REFERENCES therapy_service_programs(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS therapy_vt_def_amt_job_scope_unique
  ON therapy_visit_type_default_amounts (household_id, job_id, visit_type)
  WHERE program_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS therapy_vt_def_amt_program_scope_unique
  ON therapy_visit_type_default_amounts (household_id, program_id, visit_type)
  WHERE program_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_therapy_vt_def_amt_household_job
  ON therapy_visit_type_default_amounts (household_id, job_id);

CREATE INDEX IF NOT EXISTS idx_therapy_vt_def_amt_program
  ON therapy_visit_type_default_amounts (program_id)
  WHERE program_id IS NOT NULL;
