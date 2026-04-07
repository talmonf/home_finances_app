-- Loans: add support for fixed and index-linked interest rates.

ALTER TABLE "loans"
  ADD COLUMN IF NOT EXISTS "interest_rate_percent" DECIMAL(7, 4),
  ADD COLUMN IF NOT EXISTS "interest_rate_linked_index" TEXT,
  ADD COLUMN IF NOT EXISTS "interest_rate_index_delta_percent" DECIMAL(7, 4);
