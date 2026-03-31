-- 032: Tasks links + single-assignee validation
-- Type: ALTER
-- Requires: 004_tasks.sql

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS link_1_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS link_1_url TEXT,
  ADD COLUMN IF NOT EXISTS link_2_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS link_2_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_single_assignee_chk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_single_assignee_chk
      CHECK (NOT (family_member_id IS NOT NULL AND assigned_user_id IS NOT NULL));
  END IF;
END
$$;
