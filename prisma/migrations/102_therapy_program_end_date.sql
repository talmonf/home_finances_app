-- Add optional end date for therapy programs.

ALTER TABLE therapy_service_programs
  ADD COLUMN IF NOT EXISTS end_date DATE NULL;
