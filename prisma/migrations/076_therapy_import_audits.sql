CREATE TYPE therapy_import_audit_status AS ENUM ('in_progress', 'successful', 'failed');

CREATE TABLE IF NOT EXISTS therapy_import_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status therapy_import_audit_status NOT NULL DEFAULT 'in_progress',
  profile TEXT NOT NULL,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  selected_program_id UUID REFERENCES therapy_service_programs(id) ON DELETE SET NULL,
  sheet_name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_clients INTEGER NOT NULL DEFAULT 0,
  created_treatments INTEGER NOT NULL DEFAULT 0,
  created_receipts INTEGER NOT NULL DEFAULT 0,
  created_allocations INTEGER NOT NULL DEFAULT 0,
  created_consultations INTEGER NOT NULL DEFAULT 0,
  created_travel INTEGER NOT NULL DEFAULT 0,
  created_programs INTEGER NOT NULL DEFAULT 0,
  created_consultation_allocations INTEGER NOT NULL DEFAULT 0,
  created_travel_allocations INTEGER NOT NULL DEFAULT 0,
  blocking_errors_count INTEGER NOT NULL DEFAULT 0,
  warnings_count INTEGER NOT NULL DEFAULT 0,
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_therapy_import_audits_household_created
  ON therapy_import_audits (household_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_therapy_import_audits_user_created
  ON therapy_import_audits (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_therapy_import_audits_status_created
  ON therapy_import_audits (status, created_at DESC);

CREATE OR REPLACE FUNCTION set_therapy_import_audits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_therapy_import_audits_updated_at ON therapy_import_audits;
CREATE TRIGGER trg_therapy_import_audits_updated_at
BEFORE UPDATE ON therapy_import_audits
FOR EACH ROW
EXECUTE FUNCTION set_therapy_import_audits_updated_at();
