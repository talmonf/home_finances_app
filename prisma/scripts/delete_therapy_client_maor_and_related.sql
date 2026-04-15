-- Delete therapy client(s) with first name "מאור" and related data for one household:
--   receipt allocations → receipts that end up with zero allocations
--   treatment attachments, travel entries linked to those treatments
--   appointments and recurring series for the client
--   therapy_clients_jobs, treatments, client row
--
-- Does NOT delete jobs, programs, bank accounts, or receipts that still have other
-- allocations after removing this client's treatments.
--
-- HOW TO RUN (AUTO-COMMIT FRIENDLY, PRE-FILLED FOR YOUR CASE)
-- 1) Run Step A inspection and verify only the intended client row(s) appear.
-- 2) Run Step B top-to-bottom in the SAME SQL session/connection.
-- 3) This script is pre-filled for household:
--    d081aa1b-a186-4421-a5e9-3d382b3f477a
--    and orphan receipt numbers: 0135, 0137, 0143, 0144, 0149

-- ---------------------------------------------------------------------------
-- Step A — inspection (run separately; no changes)
-- ---------------------------------------------------------------------------
-- SELECT c.id,
--        c.first_name,
--        c.last_name,
--        c.created_at,
--        (SELECT COUNT(*) FROM therapy_treatments t WHERE t.client_id = c.id) AS treatments,
--        (SELECT COUNT(DISTINCT a.receipt_id)
--         FROM therapy_receipt_allocations a
--         JOIN therapy_treatments t ON t.id = a.treatment_id
--         WHERE t.client_id = c.id) AS receipts_touching_client
-- FROM therapy_clients c
-- WHERE c.household_id = 'd081aa1b-a186-4421-a5e9-3d382b3f477a'::uuid
--   AND c.first_name = 'מאור';

-- ---------------------------------------------------------------------------
-- Step B — destructive (auto-commit mode)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS _target_clients;
DROP TABLE IF EXISTS _target_treatments;
DROP TABLE IF EXISTS _receipts_touched;

CREATE TEMP TABLE _target_clients (id uuid PRIMARY KEY);
INSERT INTO _target_clients (id)
SELECT c.id
FROM therapy_clients c
WHERE c.household_id = 'd081aa1b-a186-4421-a5e9-3d382b3f477a'::uuid
  AND c.first_name = 'מאור';
-- If multiple clients match, add: AND c.id = 'YOUR-CLIENT-UUID'::uuid

CREATE TEMP TABLE _target_treatments (id uuid PRIMARY KEY);
INSERT INTO _target_treatments (id)
SELECT t.id
FROM therapy_treatments t
WHERE t.client_id IN (SELECT id FROM _target_clients);

CREATE TEMP TABLE _receipts_touched (receipt_id uuid PRIMARY KEY);
INSERT INTO _receipts_touched (receipt_id)
SELECT DISTINCT a.receipt_id
FROM therapy_receipt_allocations a
WHERE a.treatment_id IN (SELECT id FROM _target_treatments);

-- Add orphan receipts from the known bad import (no allocations).
INSERT INTO _receipts_touched (receipt_id)
SELECT r.id
FROM therapy_receipts r
WHERE r.household_id = 'd081aa1b-a186-4421-a5e9-3d382b3f477a'::uuid
  AND r.recipient_type = 'client'
  AND NOT EXISTS (
    SELECT 1
    FROM therapy_receipt_allocations a
    WHERE a.receipt_id = r.id
  )
  AND r.receipt_number IN ('0135', '0137', '0143', '0144', '0149')
ON CONFLICT (receipt_id) DO NOTHING;

DELETE FROM therapy_receipt_allocations a
WHERE a.treatment_id IN (SELECT id FROM _target_treatments);

DELETE FROM therapy_receipts r
WHERE r.id IN (SELECT receipt_id FROM _receipts_touched)
  AND NOT EXISTS (
    SELECT 1
    FROM therapy_receipt_allocations a2
    WHERE a2.receipt_id = r.id
  );

DELETE FROM therapy_treatment_attachments x
WHERE x.treatment_id IN (SELECT id FROM _target_treatments);

DELETE FROM therapy_travel_entries e
WHERE e.treatment_id IN (SELECT id FROM _target_treatments);

DELETE FROM therapy_appointments ap
WHERE ap.client_id IN (SELECT id FROM _target_clients);

DELETE FROM therapy_appointment_series s
WHERE s.client_id IN (SELECT id FROM _target_clients);

DELETE FROM therapy_clients_jobs cj
WHERE cj.client_id IN (SELECT id FROM _target_clients);

DELETE FROM therapy_treatments t
WHERE t.id IN (SELECT id FROM _target_treatments);

DELETE FROM therapy_clients c
WHERE c.id IN (SELECT id FROM _target_clients);

-- Optional cleanup in this session:
DROP TABLE IF EXISTS _receipts_touched;
DROP TABLE IF EXISTS _target_treatments;
DROP TABLE IF EXISTS _target_clients;
