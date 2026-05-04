-- Travel entries: optional consultation link, optional km; backfill job_id from treatment.

ALTER TABLE therapy_travel_entries DROP CONSTRAINT IF EXISTS therapy_travel_job_or_treatment_check;

UPDATE therapy_travel_entries e
SET job_id = t.job_id
FROM therapy_treatments t
WHERE e.treatment_id = t.id
  AND e.job_id IS NULL;

ALTER TABLE therapy_travel_entries
  ADD COLUMN IF NOT EXISTS consultation_id uuid,
  ADD COLUMN IF NOT EXISTS km numeric(10, 2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'therapy_travel_entries_consultation_id_fkey'
  ) THEN
    ALTER TABLE therapy_travel_entries
      ADD CONSTRAINT therapy_travel_entries_consultation_id_fkey
      FOREIGN KEY (consultation_id) REFERENCES therapy_consultations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_therapy_travel_consultation ON therapy_travel_entries(consultation_id) WHERE consultation_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'therapy_travel_entries_treatment_consultation_exclusive'
  ) THEN
    ALTER TABLE therapy_travel_entries
      ADD CONSTRAINT therapy_travel_entries_treatment_consultation_exclusive
      CHECK (
        NOT (treatment_id IS NOT NULL AND consultation_id IS NOT NULL)
      );
  END IF;
END $$;
