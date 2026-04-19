# Database scripts

All database scripts use a **numbering system** so you can track what you’ve run.

## Where to run scripts

- **Location:** `prisma/migrations/`
- **Index:** Open **`prisma/migrations/000_INDEX.md`** — the **checklist is at the top**; the detailed script table with descriptions is below.

## Numbering

| Prefix | Meaning |
|--------|--------|
| `001_`, `002_`, … | Run in order. Each script is idempotent where possible (safe if objects already exist). |
| `00N_alter_...` | Schema changes (new/renamed columns, new enum values). Run only ALTER scripts you haven’t run yet. |

## Workflow

1. Open `prisma/migrations/000_INDEX.md` and use the **Checklist** section at the top.
2. Run each listed script in order (e.g. in Vercel Postgres Query or any SQL client).
3. Mark the script as run in that checklist.
4. When new migrations appear (e.g. `004_alter_...`), run only the new ones and check them off.

## Table structure changes

When the app changes table structures, **ALTER** scripts will be added (e.g. `004_alter_transactions_add_foo.sql`). See `prisma/migrations/README_ALTERS.md` for the convention.

## Old DDL files

The previous `ddl_*.sql` files in `prisma/` have been superseded by the numbered scripts in `prisma/migrations/`. You can remove or ignore them; use the migrations folder and index from now on.
