-- Receipt allocations for consultations and travel entries.
-- Extends monthly organization payment linking beyond treatments.

CREATE TABLE IF NOT EXISTS therapy_receipt_consultation_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  receipt_id uuid NOT NULL REFERENCES therapy_receipts(id) ON DELETE CASCADE,
  consultation_id uuid NOT NULL REFERENCES therapy_consultations(id) ON DELETE CASCADE,
  amount numeric(15, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (receipt_id, consultation_id)
);

CREATE TABLE IF NOT EXISTS therapy_receipt_travel_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  receipt_id uuid NOT NULL REFERENCES therapy_receipts(id) ON DELETE CASCADE,
  travel_entry_id uuid NOT NULL REFERENCES therapy_travel_entries(id) ON DELETE CASCADE,
  amount numeric(15, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (receipt_id, travel_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_trca_household_receipt
  ON therapy_receipt_consultation_allocations (household_id, receipt_id);

CREATE INDEX IF NOT EXISTS idx_trca_consultation
  ON therapy_receipt_consultation_allocations (consultation_id);

CREATE INDEX IF NOT EXISTS idx_trta_household_receipt
  ON therapy_receipt_travel_allocations (household_id, receipt_id);

CREATE INDEX IF NOT EXISTS idx_trta_travel
  ON therapy_receipt_travel_allocations (travel_entry_id);
