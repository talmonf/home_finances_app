-- DDL: Create enum types required by the users table
-- Only run this if you get: type "public.UserRole" does not exist
-- and your database does NOT already have user_role / user_type enums.
--
-- If your database already has enums named user_role and user_type (lowercase),
-- do NOT run this. Instead, the Prisma schema uses @@map("user_role") and
-- @@map("user_type") so Prisma uses those existing types.

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
