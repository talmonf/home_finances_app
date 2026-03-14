-- Run these in your PostgreSQL client (Vercel Query tab, psql, TablePlus, etc.)
-- to confirm tables and enums match what the app expects.

-- 1) Tables that should exist (Prisma models)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2) Enum types in public schema (user_role, user_type, study_or_class_type, subscription_billing_interval, etc.)
SELECT t.typname AS enum_name,
       array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- 3) Columns of critical tables (spot-check)
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 4) Row counts (optional – confirms tables are readable)
SELECT 'households' AS tbl, count(*) FROM households
UNION ALL SELECT 'users', count(*) FROM users
UNION ALL SELECT 'super_admins', count(*) FROM super_admins
UNION ALL SELECT 'family_members', count(*) FROM family_members
UNION ALL SELECT 'bank_accounts', count(*) FROM bank_accounts
UNION ALL SELECT 'credit_cards', count(*) FROM credit_cards
UNION ALL SELECT 'studies_and_classes', count(*) FROM studies_and_classes
UNION ALL SELECT 'subscriptions', count(*) FROM subscriptions;
