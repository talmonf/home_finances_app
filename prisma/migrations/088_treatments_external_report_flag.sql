ALTER TABLE therapy_treatments
ADD COLUMN reported_to_external_system BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE jobs
ADD COLUMN external_reporting_system TEXT;
