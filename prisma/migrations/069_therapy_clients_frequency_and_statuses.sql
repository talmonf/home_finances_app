ALTER TABLE "therapy_clients"
  ADD COLUMN IF NOT EXISTS "visits_per_period_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "visits_per_period_weeks" INTEGER,
  ADD COLUMN IF NOT EXISTS "disability_status" TEXT,
  ADD COLUMN IF NOT EXISTS "rehab_basket_status" TEXT;
