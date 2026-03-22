-- extract_schema_for_review.sql
-- Run against your PostgreSQL database (e.g. psql, pgAdmin, or any SQL client).
-- Copy ALL result sets into a text file and share for comparison with the application.
--
-- Usage (example):
--   psql "$DATABASE_URL" -f prisma/scripts/extract_schema_for_review.sql > schema_extract.txt
--
-- Or run each section separately if your client only shows one result grid at a time.

\echo '========== 1. TABLES IN public =========='
SELECT tablename AS table_name
FROM pg_catalog.pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo '========== 2. COLUMNS (public) =========='
SELECT
  c.table_name,
  c.ordinal_position AS pos,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
JOIN information_schema.tables t
  ON t.table_schema = c.table_schema AND t.table_name = c.table_name
WHERE c.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY c.table_name, c.ordinal_position;

\echo '========== 3. PRIMARY KEYS =========='
SELECT
  tc.table_name,
  kcu.column_name,
  kcu.ordinal_position
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_schema = kcu.constraint_schema
  AND tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_name, kcu.ordinal_position;

\echo '========== 4. UNIQUE CONSTRAINTS (not PK) =========='
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  kcu.ordinal_position
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_schema = kcu.constraint_schema
  AND tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;

\echo '========== 5. FOREIGN KEYS =========='
SELECT
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  rc.update_rule,
  rc.delete_rule,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_schema = kcu.constraint_schema
  AND tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_schema = tc.constraint_schema
  AND ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_schema = tc.constraint_schema
  AND rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.ordinal_position;

\echo '========== 6. ENUM TYPES (public) =========='
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value,
  e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

\echo '========== 7. ROW COUNTS (approximate, fast) =========='
SELECT
  relname AS table_name,
  n_live_tup AS approximate_row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;
