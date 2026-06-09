import test from "node:test";
import assert from "node:assert/strict";
type RenewalRow = {
  id: string;
  category: string;
  itemName: string;
  owner: string;
  ownerId: string | null;
  renewalDate: Date;
  renewalType: string;
  href: string;
};

function row(id: string, renewalDate: string): RenewalRow {
  return {
    id,
    category: "Subscription",
    itemName: id,
    owner: "Household",
    ownerId: null,
    renewalDate: new Date(renewalDate),
    renewalType: "Monthly",
    href: "/dashboard/subscriptions",
  };
}

test("addDaysLocal preserves calendar boundaries", async () => {
  process.env.DATABASE_URL ??= "postgresql://user:pass@127.0.0.1:5432/testdb";
  const { addDaysLocal } = await import("@/lib/upcoming-renewals/compute");
  const start = new Date(2026, 0, 31);
  const result = addDaysLocal(start, 1);
  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 1);
  assert.equal(result.getDate(), 1);
});

test("filterRenewalRowsByDaysAhead includes only today..today+N inclusive", async () => {
  process.env.DATABASE_URL ??= "postgresql://user:pass@127.0.0.1:5432/testdb";
  const { filterRenewalRowsByDaysAhead } = await import("@/lib/upcoming-renewals/compute");
  const today = new Date(2026, 4, 8); // local date-only
  const rows: RenewalRow[] = [
    { ...row("past", "2026-05-07T00:00:00.000Z"), category: "Insurance" },
    row("today", "2026-05-08T00:00:00.000Z"),
    row("within", "2026-05-10T00:00:00.000Z"),
    row("edge", "2026-05-11T00:00:00.000Z"),
    row("outside", "2026-05-12T00:00:00.000Z"),
  ];

  const filtered = filterRenewalRowsByDaysAhead(rows, today, 3);
  assert.deepEqual(
    filtered.map((r) => r.id),
    ["today", "within", "edge"],
  );
});

test("filterRenewalRowsByDaysAhead with includePastDue adds overdue rows", async () => {
  process.env.DATABASE_URL ??= "postgresql://user:pass@127.0.0.1:5432/testdb";
  const { filterRenewalRowsByDaysAhead } = await import("@/lib/upcoming-renewals/compute");
  const today = new Date(2026, 4, 8);
  const rows: RenewalRow[] = [
    row("past", "2026-05-07T00:00:00.000Z"),
    row("today", "2026-05-08T00:00:00.000Z"),
    row("within", "2026-05-10T00:00:00.000Z"),
  ];

  const filtered = filterRenewalRowsByDaysAhead(rows, today, 3, { includePastDue: true });
  assert.deepEqual(filtered.map((r) => r.id), ["past", "today", "within"]);
});

test("filterRenewalRowsByDaysAhead without includePastDue keeps dashboard-style past-due rows", async () => {
  process.env.DATABASE_URL ??= "postgresql://user:pass@127.0.0.1:5432/testdb";
  const { filterRenewalRowsByDaysAhead } = await import("@/lib/upcoming-renewals/compute");
  const today = new Date(2026, 4, 8);
  const subscriptionRow = { ...row("sub-past", "2026-05-07T00:00:00.000Z"), category: "Subscription" };
  const taskRow = { ...row("task-past", "2026-05-07T00:00:00.000Z"), category: "Task" };
  const donationRow = { ...row("donation-past", "2026-05-06T00:00:00.000Z"), category: "Donation" };
  const insuranceRow = { ...row("insurance-past", "2026-05-07T00:00:00.000Z"), category: "Insurance" };
  const rows: RenewalRow[] = [subscriptionRow, taskRow, donationRow, insuranceRow, row("today", "2026-05-08T00:00:00.000Z")];

  const filtered = filterRenewalRowsByDaysAhead(rows, today, 3);
  assert.deepEqual(filtered.map((r) => r.id), ["sub-past", "task-past", "donation-past", "today"]);
});

test("filterRenewalRowsByDaysAhead keeps paired birthday/anniversary rows when either date is in window", async () => {
  process.env.DATABASE_URL ??= "postgresql://user:pass@127.0.0.1:5432/testdb";
  const { filterRenewalRowsByDaysAhead } = await import("@/lib/upcoming-renewals/compute");
  const today = new Date(2026, 4, 27);
  const rows: RenewalRow[] = [
    {
      id: "anniversary-gregorian-m1",
      category: "Anniversary",
      itemName: "A & B",
      owner: "Household",
      ownerId: null,
      renewalDate: new Date(2026, 5, 21),
      renewalType: "Anniversary",
      href: "/dashboard/family-members/marriages",
    },
    {
      id: "anniversary-hebrew-m1",
      category: "Anniversary",
      itemName: "A & B",
      owner: "Household",
      ownerId: null,
      renewalDate: new Date(2026, 5, 26),
      renewalType: "Hebrew: 12 Tammuz",
      href: "/dashboard/family-members/marriages",
    },
    {
      id: "anniversary-gregorian-m2",
      category: "Anniversary",
      itemName: "C & D",
      owner: "Household",
      ownerId: null,
      renewalDate: new Date(2026, 7, 1),
      renewalType: "Anniversary",
      href: "/dashboard/family-members/marriages",
    },
  ];

  // Gregorian (21 Jun) is inside 25 days; Hebrew (26 Jun) is outside — both should appear.
  const filtered = filterRenewalRowsByDaysAhead(rows, today, 25);
  assert.deepEqual(filtered.map((r) => r.id), ["anniversary-gregorian-m1", "anniversary-hebrew-m1"]);
  assert.equal(filtered.length, 2);
});

test("filterRenewalRowsByDaysAhead keeps paired special-date rows when either date is in window", async () => {
  process.env.DATABASE_URL ??= "postgresql://user:pass@127.0.0.1:5432/testdb";
  const { filterRenewalRowsByDaysAhead } = await import("@/lib/upcoming-renewals/compute");
  const today = new Date(2026, 4, 27);
  const rows: RenewalRow[] = [
    {
      id: "special-date-gregorian-s1",
      category: "Special date",
      itemName: "Grandfather Moshe",
      owner: "Grandfather Moshe",
      ownerId: null,
      renewalDate: new Date(2026, 5, 10),
      renewalType: "Death",
      href: "/dashboard/family-members/special-dates/s1/edit",
    },
    {
      id: "special-date-hebrew-s1",
      category: "Special date",
      itemName: "Grandfather Moshe",
      owner: "Grandfather Moshe",
      ownerId: null,
      renewalDate: new Date(2026, 5, 15),
      renewalType: "Hebrew: 28 Sivan",
      href: "/dashboard/family-members/special-dates/s1/edit",
    },
    {
      id: "special-date-gregorian-s2",
      category: "Special date",
      itemName: "Rachel",
      owner: "Rachel",
      ownerId: "m1",
      renewalDate: new Date(2026, 8, 1),
      renewalType: "Bar mitzvah",
      href: "/dashboard/family-members/special-dates/s2/edit",
    },
  ];

  const filtered = filterRenewalRowsByDaysAhead(rows, today, 14);
  assert.deepEqual(filtered.map((r) => r.id), ["special-date-gregorian-s1", "special-date-hebrew-s1"]);
});
