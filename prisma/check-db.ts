/**
 * Database check: verifies that tables and enums expected by the Prisma schema exist
 * and are readable. Run with: npx tsx prisma/check-db.ts
 * (Or: node --import tsx prisma/check-db.ts)
 *
 * Requires DATABASE_URL in the environment (e.g. from .env).
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL. Set it in .env or the environment.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type Check = { name: string; run: () => Promise<void> };

const checks: Check[] = [
  {
    name: "households",
    run: async () => {
      await prisma.households.findFirst();
    },
  },
  {
    name: "users",
    run: async () => {
      await prisma.users.findFirst();
    },
  },
  {
    name: "super_admins",
    run: async () => {
      await prisma.super_admins.findFirst();
    },
  },
  {
    name: "family_members",
    run: async () => {
      await prisma.family_members.findFirst();
    },
  },
  {
    name: "bank_accounts",
    run: async () => {
      await prisma.bank_accounts.findFirst();
    },
  },
  {
    name: "credit_cards",
    run: async () => {
      await prisma.credit_cards.findFirst();
    },
  },
  {
    name: "studies_and_classes",
    run: async () => {
      await prisma.studies_and_classes.findFirst();
    },
  },
  {
    name: "subscriptions",
    run: async () => {
      await prisma.subscriptions.findFirst();
    },
  },
  {
    name: "significant_purchases",
    run: async () => {
      await prisma.significant_purchases.findFirst();
    },
  },
  {
    name: "digital_payment_methods",
    run: async () => {
      await prisma.digital_payment_methods.findFirst();
    },
  },
  {
    name: "bank_account_members",
    run: async () => {
      await prisma.bank_account_members.findFirst();
    },
  },
];

async function main() {
  console.log("Checking database against Prisma schema...\n");

  let failed = 0;
  for (const { name, run } of checks) {
    try {
      await run();
      console.log(`  ✓ ${name}`);
    } catch (e) {
      failed++;
      const err = e as Error;
      console.log(`  ✗ ${name}`);
      console.log(`    ${err.message}`);
    }
  }

  // Optional: list enum types (raw SQL)
  try {
    const enums = await prisma.$queryRaw<
      { typname: string }[]
    >`SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') ORDER BY typname`;
    console.log("\n  Enums in public schema:", enums.map((r) => r.typname).join(", ") || "(none)");
  } catch (e) {
    console.log("\n  (Could not list enums)", (e as Error).message);
  }

  await prisma.$disconnect();
  pool.end();

  console.log("");
  if (failed > 0) {
    console.log(`Result: ${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log("Result: All checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
