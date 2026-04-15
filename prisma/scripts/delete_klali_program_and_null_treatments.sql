-- Remove auto-created "כללי" (general) therapy programs and detach treatments.
-- Run after 073 (nullable therapy_treatments.program_id) is applied.
--
-- BEFORE RUNNING: inspect what will be affected:
--   SELECT p.id, p.household_id, p.job_id, p.name, j.job_title
--   FROM therapy_service_programs p
--   JOIN jobs j ON j.id = p.job_id
--   WHERE p.name = 'כללי';
--
-- Optional: limit to one job by uncommenting AND p.job_id = '...' below (all occurrences).

BEGIN;

WITH target_programs AS (
  SELECT id
  FROM therapy_service_programs
  WHERE name = 'כללי'
  -- AND job_id = 'YOUR-JOB-UUID-HERE'::uuid
)
UPDATE therapy_treatments
SET program_id = NULL
WHERE program_id IN (SELECT id FROM target_programs);

WITH target_programs AS (
  SELECT id
  FROM therapy_service_programs
  WHERE name = 'כללי'
  -- AND job_id = 'YOUR-JOB-UUID-HERE'::uuid
)
UPDATE therapy_clients
SET default_program_id = NULL
WHERE default_program_id IN (SELECT id FROM target_programs);

WITH target_programs AS (
  SELECT id
  FROM therapy_service_programs
  WHERE name = 'כללי'
  -- AND job_id = 'YOUR-JOB-UUID-HERE'::uuid
)
UPDATE therapy_appointment_series
SET program_id = NULL
WHERE program_id IN (SELECT id FROM target_programs);

WITH target_programs AS (
  SELECT id
  FROM therapy_service_programs
  WHERE name = 'כללי'
  -- AND job_id = 'YOUR-JOB-UUID-HERE'::uuid
)
UPDATE therapy_appointments
SET program_id = NULL
WHERE program_id IN (SELECT id FROM target_programs);

-- Visit-type default rows for this program (would also CASCADE on program delete; explicit is clear)
DELETE FROM therapy_visit_type_default_amounts
WHERE program_id IN (
  SELECT id FROM therapy_service_programs WHERE name = 'כללי'
  -- AND job_id = 'YOUR-JOB-UUID-HERE'::uuid
);

DELETE FROM therapy_service_programs
WHERE name = 'כללי'
-- AND job_id = 'YOUR-JOB-UUID-HERE'::uuid
;

COMMIT;
