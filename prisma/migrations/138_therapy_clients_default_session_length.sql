-- Per-client default session duration (overrides job/program defaults; appointment still wins).
ALTER TABLE therapy_clients
  ADD COLUMN IF NOT EXISTS default_session_length_minutes INTEGER NULL;
