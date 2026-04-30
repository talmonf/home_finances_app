-- Consultations rework: single payable amount + unified transaction link + multi-client participants.

ALTER TABLE therapy_consultations
  ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ILS',
  ADD COLUMN IF NOT EXISTS linked_transaction_id UUID;

-- Backfill canonical amount/currency from legacy fields.
UPDATE therapy_consultations
SET
  amount = COALESCE(amount, income_amount, cost_amount),
  currency = COALESCE(NULLIF(currency, ''), income_currency, cost_currency, 'ILS')
WHERE amount IS NULL;

-- Backfill unified linked transaction from the legacy split fields.
UPDATE therapy_consultations
SET linked_transaction_id = COALESCE(linked_transaction_id, linked_income_transaction_id, linked_cost_transaction_id)
WHERE linked_transaction_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'therapy_consultations_linked_transaction_id_fkey'
  ) THEN
    ALTER TABLE therapy_consultations
      ADD CONSTRAINT therapy_consultations_linked_transaction_id_fkey
      FOREIGN KEY (linked_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS therapy_consultation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES therapy_consultations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES therapy_clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (consultation_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_therapy_consultation_participants_household_consultation
  ON therapy_consultation_participants (household_id, consultation_id);
