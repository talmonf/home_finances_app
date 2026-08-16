-- Optional free-text note on scheduled appointments and recurring series.
ALTER TABLE therapy_appointments
  ADD COLUMN IF NOT EXISTS note TEXT NULL;

ALTER TABLE therapy_appointment_series
  ADD COLUMN IF NOT EXISTS note TEXT NULL;
