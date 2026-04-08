-- Private Clinic: optional per-tab navigation visibility (JSON map of tab key -> boolean)

ALTER TABLE therapy_settings
  ADD COLUMN IF NOT EXISTS nav_tabs_json JSONB NULL;
