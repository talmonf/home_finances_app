-- Delete ALL therapy treatments for a specific household + job and related rows.
--
-- Anchor filters (required):
--   therapy_treatments.household_id = :household_id
--   therapy_treatments.job_id       = :job_id
--
-- Also removes:
--   - therapy_receipt_allocations for those treatments
--   - therapy_treatment_attachments for those treatments
--   - therapy_travel_entries for the same job (linked and unlinked)
--   - therapy_consultations for the same job
--   - therapy_appointments and therapy_appointment_series for the same job
--   - therapy_clients_jobs links for this job (for touched clients)
--   - touched clients that become fully orphaned (no treatments and no job links)
--   - therapy_receipts in the same household+job that become orphaned (0 allocations)
--
-- Does NOT remove:
--   - clients
--   - jobs/programs
--   - clients that still have other job links or treatments
--
-- ---------------------------------------------------------------------------
-- Step 0 — set your anchors (replace values before running)
-- ---------------------------------------------------------------------------
-- Example:
--   household_id = '00000000-0000-0000-0000-000000000000'
--   job_id       = '00000000-0000-0000-0000-000000000000'
--
-- ---------------------------------------------------------------------------
-- Step A — inspection only (safe; run first)
-- ---------------------------------------------------------------------------
-- SELECT
--   COUNT(*) AS treatments_to_delete
-- FROM therapy_treatments t
-- WHERE t.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
--   AND t.job_id = 'REPLACE_JOB_ID'::uuid;
--
-- SELECT
--   COUNT(*) AS allocations_touching_target_treatments
-- FROM therapy_receipt_allocations a
-- JOIN therapy_treatments t ON t.id = a.treatment_id
-- WHERE t.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
--   AND t.job_id = 'REPLACE_JOB_ID'::uuid;
--
-- SELECT
--   COUNT(*) AS candidate_orphan_receipts_in_job
-- FROM therapy_receipts r
-- WHERE r.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
--   AND r.job_id = 'REPLACE_JOB_ID'::uuid
--   AND NOT EXISTS (
--     SELECT 1
--     FROM therapy_receipt_allocations a
--     WHERE a.receipt_id = r.id
--   );
--
-- ---------------------------------------------------------------------------
-- Step B — destructive (run top-to-bottom in one session)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS _target_treatments;
DROP TABLE IF EXISTS _receipts_touched;
DROP TABLE IF EXISTS _target_clients;

CREATE TEMP TABLE _target_treatments (id uuid PRIMARY KEY);
INSERT INTO _target_treatments (id)
SELECT t.id
FROM therapy_treatments t
WHERE t.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
  AND t.job_id = 'REPLACE_JOB_ID'::uuid;

CREATE TEMP TABLE _target_clients (id uuid PRIMARY KEY);
INSERT INTO _target_clients (id)
SELECT DISTINCT t.client_id
FROM therapy_treatments t
WHERE t.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
  AND t.job_id = 'REPLACE_JOB_ID'::uuid
UNION
SELECT DISTINCT cj.client_id
FROM therapy_clients_jobs cj
WHERE cj.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
  AND cj.job_id = 'REPLACE_JOB_ID'::uuid;

CREATE TEMP TABLE _receipts_touched (receipt_id uuid PRIMARY KEY);
INSERT INTO _receipts_touched (receipt_id)
SELECT DISTINCT a.receipt_id
FROM therapy_receipt_allocations a
WHERE a.treatment_id IN (SELECT id FROM _target_treatments);

-- Remove links from target treatments to receipts.
DELETE FROM therapy_receipt_allocations a
WHERE a.treatment_id IN (SELECT id FROM _target_treatments);

-- Remove receipts from the same job+household if they are now orphaned.
DELETE FROM therapy_receipts r
WHERE r.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
  AND r.job_id = 'REPLACE_JOB_ID'::uuid
  AND (
    r.id IN (SELECT receipt_id FROM _receipts_touched)
    OR NOT EXISTS (
      SELECT 1
      FROM therapy_receipt_allocations a
      WHERE a.receipt_id = r.id
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM therapy_receipt_allocations a2
    WHERE a2.receipt_id = r.id
  );

DELETE FROM therapy_treatment_attachments x
WHERE x.treatment_id IN (SELECT id FROM _target_treatments);

DELETE FROM therapy_travel_entries e
WHERE e.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
  AND e.job_id = 'REPLACE_JOB_ID'::uuid;

DELETE FROM therapy_consultations c
WHERE c.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
  AND c.job_id = 'REPLACE_JOB_ID'::uuid;

DELETE FROM therapy_appointments a
WHERE a.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
  AND a.job_id = 'REPLACE_JOB_ID'::uuid;

DELETE FROM therapy_appointment_series s
WHERE s.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
  AND s.job_id = 'REPLACE_JOB_ID'::uuid;

DELETE FROM therapy_treatments t
WHERE t.id IN (SELECT id FROM _target_treatments);

DELETE FROM therapy_clients_jobs cj
WHERE cj.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
  AND cj.job_id = 'REPLACE_JOB_ID'::uuid
  AND cj.client_id IN (SELECT id FROM _target_clients);

-- Delete touched clients only if they are now fully orphaned.
DELETE FROM therapy_clients c
WHERE c.id IN (SELECT id FROM _target_clients)
  AND c.household_id = 'REPLACE_HOUSEHOLD_ID'::uuid
  AND NOT EXISTS (
    SELECT 1
    FROM therapy_treatments t2
    WHERE t2.client_id = c.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM therapy_clients_jobs cj2
    WHERE cj2.client_id = c.id
  );

-- Optional summary (helpful verification):
SELECT
  (SELECT COUNT(*) FROM _target_treatments) AS targeted_treatments,
  (SELECT COUNT(*) FROM _receipts_touched) AS touched_receipts,
  (SELECT COUNT(*) FROM _target_clients) AS touched_clients;

-- Optional temp cleanup:
DROP TABLE IF EXISTS _receipts_touched;
DROP TABLE IF EXISTS _target_treatments;
DROP TABLE IF EXISTS _target_clients;
