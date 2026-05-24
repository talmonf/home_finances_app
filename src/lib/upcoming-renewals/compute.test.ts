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
