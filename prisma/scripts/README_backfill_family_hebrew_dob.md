# Backfill Hebrew date of birth

Populates `hebrew_date_of_birth_*` on `family_members` from existing `date_of_birth` (Gregorian).

**Prerequisites:** migration `119_family_hebrew_dates_and_marriages.sql` applied; `DATABASE_URL` set.

```bash
npx tsx prisma/scripts/backfill-family-hebrew-dob.ts --dry-run
npx tsx prisma/scripts/backfill-family-hebrew-dob.ts
npx tsx prisma/scripts/backfill-family-hebrew-dob.ts --household-id=<uuid>
```

Skips members that already have Hebrew day or month set (does not overwrite manual edits).
