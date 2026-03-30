-- Donations category: user-defined grouping (Yeshiva, Cancer patients, Food packages, etc.)

ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Other';

