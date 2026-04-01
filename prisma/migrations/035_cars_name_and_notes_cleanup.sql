-- 035_cars_name_and_notes_cleanup.sql
-- Cars: remove VIN, add custom name + detailed purchase/sale notes

ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS custom_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS purchase_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS sale_notes TEXT NULL;

ALTER TABLE cars
  DROP COLUMN IF EXISTS vin;
