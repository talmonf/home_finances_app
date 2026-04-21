-- Private clinic nav tabs: disable the "Families" tab by default and for all existing rows.
-- New/empty settings inherit default from app code (`mergePrivateClinicNavVisibility`).
UPDATE "therapy_settings"
SET "nav_tabs_json" = jsonb_set(
  COALESCE("nav_tabs_json", '{}'::jsonb),
  '{families}',
  'false'::jsonb,
  true
);
