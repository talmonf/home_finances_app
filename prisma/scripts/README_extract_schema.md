# Schema extract for code review

## Run with `psql` (recommended)

From the repo root (with `DATABASE_URL` set):

```bash
psql "$DATABASE_URL" -f prisma/scripts/extract_schema_for_review.sql > schema_extract.txt
```

On Windows PowerShell, set the variable first or paste your connection string:

```powershell
psql $env:DATABASE_URL -f prisma/scripts/extract_schema_for_review.sql | Out-File -Encoding utf8 schema_extract.txt
```

## Other SQL clients

The `\echo` lines are **psql-only**. If your client errors on them, either:

- Use **psql**, or  
- Open `extract_schema_for_review.sql`, remove every line that starts with `\echo`, and run the remaining `SELECT` statements one by one (or all at once if the tool supports multiple statements).

## What to send back

Paste the full **`schema_extract.txt`** (or equivalent) into the chat. With that, we can compare **Postgres** to **[`prisma/schema.prisma`](../../schema.prisma)** and grep the **Next.js / server** code for:

- Tables that exist in the DB but are **never referenced** by Prisma or raw SQL in the app  
- Columns that exist in the DB but are **never read or written** by the app (harder: needs field-level grep; we’ll call out obvious gaps)

**Note:** Prisma models map to table names; anything only in SQL migrations or `prisma.$queryRaw` also counts as “used” if we find it in the repo.
