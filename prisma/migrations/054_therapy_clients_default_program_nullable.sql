-- 054_therapy_clients_default_program_nullable.sql
-- Make therapy clients default_program optional.

ALTER TABLE therapy_clients
  ALTER COLUMN default_program_id DROP NOT NULL;
