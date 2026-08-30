-- Optional free-text list of other team members for a client (e.g. home-hospital nurse, physician).
ALTER TABLE therapy_clients
  ADD COLUMN IF NOT EXISTS team_members TEXT NULL;
