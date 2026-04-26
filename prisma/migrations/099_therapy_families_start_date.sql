-- Optional start and end dates for a therapy family; start is also used to set client start_date for members on save.

ALTER TABLE therapy_families
  ADD COLUMN IF NOT EXISTS start_date DATE NULL;

ALTER TABLE therapy_families
  ADD COLUMN IF NOT EXISTS end_date DATE NULL;

ALTER TABLE therapy_families
  ADD COLUMN IF NOT EXISTS default_job_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_families_default_job_id_fkey') THEN
    ALTER TABLE therapy_families
      ADD CONSTRAINT therapy_families_default_job_id_fkey
      FOREIGN KEY (default_job_id) REFERENCES jobs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_therapy_families_default_job_id ON therapy_families(default_job_id);
