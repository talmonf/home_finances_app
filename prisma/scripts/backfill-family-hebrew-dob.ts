/**
 * Backfill Hebrew date-of-birth fields from existing Gregorian date_of_birth.
 *
 * Run: npx tsx prisma/scripts/backfill-family-hebrew-dob.ts
 *      npx tsx prisma/scripts/backfill-family-hebrew-dob.ts --dry-run
 *      npx tsx prisma/scripts/backfill-family-hebrew-dob.ts --household-id=<uuid>
 *
 * Requires DATABASE_URL and migration 119 applied.
 */

import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { gregorianDateToHebrewComponents } from "../../src/lib/hebrew-calendar";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const householdArg = args.find((a) => a.startsWith("--household-id="));
const householdId = householdArg?.split("=")[1]?.trim() || undefined;

const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const members = await prisma.family_members.findMany({
    where: {
      ...(householdId ? { household_id: householdId } : {}),
      date_of_birth: { not: null },
    },
    select: {
      id: true,
      full_name: true,
      date_of_birth: true,
      hebrew_date_of_birth_day: true,
      hebrew_date_of_birth_month: true,
    },
  });

  let scanned = 0;
  let updated = 0;
  let skippedHasHebrew = 0;
  let skippedNoGregorian = 0;

  for (const m of members) {
    scanned += 1;
    if (!m.date_of_birth) {
      skippedNoGregorian += 1;
      continue;
    }
    if (m.hebrew_date_of_birth_day != null || m.hebrew_date_of_birth_month != null) {
      skippedHasHebrew += 1;
      continue;
    }

    const h = gregorianDateToHebrewComponents(m.date_of_birth);
    console.log(
      `${dryRun ? "[dry-run] " : ""}Update ${m.full_name} (${m.id}): ` +
        `Gregorian ${m.date_of_birth.toISOString().slice(0, 10)} → Hebrew ${h.day}/${h.month}/${h.year}`,
    );

    if (!dryRun) {
      await prisma.family_members.update({
        where: { id: m.id },
        data: {
          hebrew_date_of_birth_day: h.day,
          hebrew_date_of_birth_month: h.month,
          hebrew_date_of_birth_year: h.year,
        },
      });
    }
    updated += 1;
  }

  console.log(
    JSON.stringify({ scanned, updated, skippedHasHebrew, skippedNoGregorian, dryRun }, null, 2),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
