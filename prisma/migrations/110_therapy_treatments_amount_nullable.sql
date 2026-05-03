-- Allow imported treatments whose fee is unknown until edited manually
-- (e.g. multi-date receipt rows where per-session share exceeds usual ×110%).

ALTER TABLE therapy_treatments
  ALTER COLUMN amount DROP NOT NULL;
