import test from "node:test";
import assert from "node:assert/strict";
import type { RenewalRow } from "@/lib/upcoming-renewals/compute";

process.env.DATABASE_URL ??= "postgresql://user:pass@127.0.0.1:5432/testdb";

function row(partial: Partial<RenewalRow> & Pick<RenewalRow, "id" | "renewalDate" | "renewalType">): RenewalRow {
  return {
    category: "Special date",
    itemName: "Boaz Friedlander",
    owner: "Boaz Friedlander",
    ownerId: "m1",
    href: "/dashboard/family-members/special-dates/s1/edit",
    ...partial,
  };
}

test("consolidateDualCalendarRows always keeps both calendars as separate rows", async () => {
  const { consolidateDualCalendarRowsForTest } = await import("@/lib/family-events/upcoming");
  const merged = consolidateDualCalendarRowsForTest({
    gregorianRow: row({
      id: "birthday-gregorian-m1",
      category: "Birthday",
      renewalDate: new Date(2027, 2, 22),
      renewalType: "",
      itemName: "Avigayil Avichzer",
      owner: "Avigayil Avichzer",
    }),
    hebrewRow: row({
      id: "birthday-hebrew-m1",
      category: "Birthday",
      renewalDate: new Date(2027, 2, 11),
      renewalType: "Hebrew: 22 Adar 5787 (Wed night-Thu 10/03/2027-11/03/2027)",
      itemName: "Avigayil Avichzer",
      owner: "Avigayil Avichzer",
    }),
  });

  assert.equal(merged.length, 2);
  assert.deepEqual(
    merged.map((r) => r.id),
    ["birthday-gregorian-m1", "birthday-hebrew-m1"],
  );
  assert.equal(merged[0]!.renewalType, "");
  assert.equal(merged[0]!.extraEmailSegments, undefined);
  assert.match(merged[1]!.renewalType, /^Hebrew:/);
});

test("consolidateDualCalendarRows keeps both when both calendars upcoming", async () => {
  const { consolidateDualCalendarRowsForTest } = await import("@/lib/family-events/upcoming");
  const merged = consolidateDualCalendarRowsForTest({
    gregorianRow: row({
      id: "birthday-gregorian-m1",
      renewalDate: new Date(2026, 5, 30),
      renewalType: "",
      itemName: "Naama Friedlander",
      owner: "Naama Friedlander",
    }),
    hebrewRow: row({
      id: "birthday-hebrew-m1",
      renewalDate: new Date(2026, 5, 12),
      renewalType: "Hebrew: 27 Sivan 5786 (Thu night-Fri 11/06/2026-12/06/2026)",
      itemName: "Naama Friedlander",
      owner: "Naama Friedlander",
    }),
  });

  assert.equal(merged.length, 2);
});

test("consolidateDualCalendarRows returns single row when only one calendar exists", async () => {
  const { consolidateDualCalendarRowsForTest } = await import("@/lib/family-events/upcoming");
  const onlyGregorian = consolidateDualCalendarRowsForTest({
    gregorianRow: row({
      id: "birthday-gregorian-m1",
      renewalDate: new Date(2026, 5, 30),
      renewalType: "",
    }),
    hebrewRow: null,
  });
  assert.deepEqual(
    onlyGregorian.map((r) => r.id),
    ["birthday-gregorian-m1"],
  );

  const onlyHebrew = consolidateDualCalendarRowsForTest({
    gregorianRow: null,
    hebrewRow: row({
      id: "birthday-hebrew-m1",
      renewalDate: new Date(2026, 5, 12),
      renewalType: "Hebrew: 27 Sivan 5786",
    }),
  });
  assert.deepEqual(
    onlyHebrew.map((r) => r.id),
    ["birthday-hebrew-m1"],
  );
});
