-- Add program start date and supported visit types.

ALTER TABLE therapy_service_programs
  ADD COLUMN IF NOT EXISTS start_date DATE NULL,
  ADD COLUMN IF NOT EXISTS supported_visit_types therapy_visit_type[] NOT NULL DEFAULT ARRAY['clinic','home','phone','video']::therapy_visit_type[];
