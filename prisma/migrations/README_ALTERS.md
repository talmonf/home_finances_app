# ALTER scripts (schema changes)

When the app adds or changes columns or enums, new **numbered ALTER** scripts will be added here (e.g. `004_alter_transactions_add_xyz.sql`). Run only the ALTER scripts you have not run yet, in order.

**Important:** If a script has already been executed on any database (especially production), **do not change that file** to add more DDL. Add the next numbered script instead (`021_…`, `022_…`, …) and record it in `000_INDEX.md`. That keeps already-migrated databases reproducible.

**Example pattern for future scripts:**

```sql
-- 004: Add column to transactions (example)
-- Run after 003_import_tables.sql

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS some_new_column VARCHAR(255);
```

For **new enum values** (e.g. add a value to an existing enum):

```sql
-- 005: Add enum value to transaction_type
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'new_value';
```

*(PostgreSQL 10+ supports `ADD VALUE IF NOT EXISTS`; on older versions use a DO block to check before adding.)*

Keep `000_INDEX.md` updated: add a new row for each script and increment the checklist.
