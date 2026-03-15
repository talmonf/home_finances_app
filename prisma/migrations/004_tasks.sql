-- 004: Tasks (task management)
-- Type: CREATE
-- Requires: households, family_members, users.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type') THEN
    CREATE TYPE task_type AS ENUM ('manual', 'automatic');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('open', 'in_work', 'on_hold', 'closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE task_priority AS ENUM ('high', 'medium', 'low');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS tasks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id      UUID NOT NULL REFERENCES households(id),
  type             task_type NOT NULL DEFAULT 'manual',
  status           task_status NOT NULL DEFAULT 'open',
  priority         task_priority NOT NULL DEFAULT 'medium',
  subject          VARCHAR(512) NOT NULL,
  description      TEXT,
  family_member_id UUID REFERENCES family_members(id),
  assigned_user_id UUID REFERENCES users(id),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_household ON tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(household_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(household_id, family_member_id, assigned_user_id);
