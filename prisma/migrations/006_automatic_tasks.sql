-- 006_automatic_tasks.sql
-- Adds basic automatic task rules without changing existing tables.
-- This script is intentionally minimal; it documents that automatic tasks
-- are created by application logic rather than schema changes.

-- No-op migration: automatic tasks use the existing `tasks` table
-- with type = 'automatic'. No database changes are required.

