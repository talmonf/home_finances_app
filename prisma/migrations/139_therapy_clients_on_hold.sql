-- Active clients can be placed on hold: no cadence next-visit (not overdue; end of Upcoming visits list).
ALTER TABLE therapy_clients
  ADD COLUMN IF NOT EXISTS on_hold BOOLEAN NOT NULL DEFAULT false;
