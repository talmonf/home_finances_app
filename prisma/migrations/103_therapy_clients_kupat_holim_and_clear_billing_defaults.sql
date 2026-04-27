-- Add client-level Kupat Holim (Israeli HMO) and clear legacy per-client billing defaults.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_kupat_holim') THEN
    CREATE TYPE therapy_kupat_holim AS ENUM ('clalit', 'maccabi', 'meuhedet', 'leumit');
  END IF;
END $$;

ALTER TABLE therapy_clients
  ADD COLUMN IF NOT EXISTS kupat_holim therapy_kupat_holim;

UPDATE therapy_clients
SET billing_basis = NULL,
    billing_timing = NULL
WHERE billing_basis IS NOT NULL
   OR billing_timing IS NOT NULL;
