-- Optional service program on consultations (same pattern as treatments).

ALTER TABLE "therapy_consultations"
  ADD COLUMN IF NOT EXISTS "program_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'therapy_consultations_program_id_fkey') THEN
    ALTER TABLE "therapy_consultations"
      ADD CONSTRAINT "therapy_consultations_program_id_fkey"
      FOREIGN KEY ("program_id") REFERENCES "therapy_service_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_therapy_consultations_program_id" ON "therapy_consultations" ("program_id");
