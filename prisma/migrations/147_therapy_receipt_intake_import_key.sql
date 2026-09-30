-- One Google Form response must not insert two receipts when Make retries.

CREATE UNIQUE INDEX IF NOT EXISTS therapy_receipts_household_gform_receipt_import_key_uidx
  ON therapy_receipts (household_id, import_key)
  WHERE import_key IS NOT NULL AND import_key LIKE 'gform-receipt:%';
