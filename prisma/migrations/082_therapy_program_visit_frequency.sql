ALTER TABLE "therapy_service_programs"
  ADD COLUMN IF NOT EXISTS "visits_per_period_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "visits_per_period_weeks" INTEGER;
