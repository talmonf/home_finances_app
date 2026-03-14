-- 001: Enums for users table (user_role, user_type)
-- Idempotent: safe to run if enums already exist.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'member');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM ('family_member', 'financial_advisor', 'other');
  END IF;
END
$$;
