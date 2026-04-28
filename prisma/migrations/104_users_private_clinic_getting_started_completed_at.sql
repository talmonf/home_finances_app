-- Nullable timestamp: user finished/dismissed Clinic getting-started guide.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS private_clinic_getting_started_completed_at TIMESTAMP WITH TIME ZONE;
