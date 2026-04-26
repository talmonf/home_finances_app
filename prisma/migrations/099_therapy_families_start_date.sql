-- Optional start and end dates for a therapy family; start is also used to set client start_date for members on save.

ALTER TABLE therapy_families
  ADD COLUMN IF NOT EXISTS start_date DATE NULL;

ALTER TABLE therapy_families
  ADD COLUMN IF NOT EXISTS end_date DATE NULL;
