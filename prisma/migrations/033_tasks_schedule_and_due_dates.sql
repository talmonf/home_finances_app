-- 033: Tasks schedule and due dates
-- Type: ALTER
-- Requires: 004_tasks.sql

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS schedule_date DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE;
