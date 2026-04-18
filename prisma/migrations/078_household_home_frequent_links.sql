-- Per-household toggles for which shortcuts appear on the home dashboard (JSON object of booleans).
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS home_frequent_links_json JSONB NULL;
