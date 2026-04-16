ALTER TABLE therapy_clients
  ADD COLUMN IF NOT EXISTS default_visit_type therapy_visit_type;
