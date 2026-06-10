-- Optional end-of-care reason for hospice-related programs when an end date is set.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'therapy_client_end_reason') THEN
    CREATE TYPE therapy_client_end_reason AS ENUM (
      'death_at_home',
      'death_in_hospital',
      'transfer_to_inpatient_hospice',
      'other'
    );
  END IF;
END $$;

ALTER TABLE therapy_clients
  ADD COLUMN IF NOT EXISTS end_reason therapy_client_end_reason;
