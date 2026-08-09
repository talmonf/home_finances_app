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

test("consolidateDualCalendarRows merges when Hebrew already passed", async () => {
  const { consolidateDualCalendarRowsForTest } = await import("@/lib/family-events/upcoming");
  const today = new Date(2026, 5, 11);
  const merged = consolidateDualCalendarRowsForTest({
    today,
    language: "en",
    gregorianRow: row({
      id: "special-date-gregorian-s1",
      renewalDate: new Date(2026, 5, 12),
      renewalType: "Fall in India",
    }),
    hebrewRow: row({
      id: "special-date-hebrew-s1",
      renewalDate: new Date(2027, 5, 28),
      renewalType: "Hebrew: 23 Sivan 5787 (Sun night-Mon 27/06/2027-28/06/2027)",
    }),
    gregorianMonthDay: { month: 5, day: 12 },
    hebrewMonthDay: { month: 3, day: 23 },
  });

  assert.equal(merged.length, 1);
  assert.equal(merged[0]!.id, "special-date-gregorian-s1");
  assert.match(merged[0]!.extraEmailSegments?.[0] ?? "", /Hebrew: 23 Sivan 5786/);
  assert.match(merged[0]!.extraEmailSegments?.[0] ?? "", /already passed/);
});

test("consolidateDualCalendarRows keeps both when next Hebrew is still upcoming soon", async () => {
  const { consolidateDualCalendarRowsForTest } = await import("@/lib/family-events/upcoming");
  // Elul 5786: last Tishrei (5786) was ~a year ago, but next Tishrei (5787) is still weeks away.
  const today = new Date(2026, 7, 9);
  const merged = consolidateDualCalendarRowsForTest({
    today,
    language: "en",
    gregorianRow: row({
      id: "birthday-gregorian-m1",
      category: "Birthday",
      renewalDate: new Date(2026, 8, 20),
      renewalType: "",
      itemName: "Achinoam Friedlander",
      owner: "Achinoam Friedlander",
    }),
    hebrewRow: row({
      id: "birthday-hebrew-m1",
      category: "Birthday",
      renewalDate: new Date(2026, 8, 27),
      renewalType: "Hebrew: 5 Tishrei 5787 (Sat night-Sun 26/09/2026-27/09/2026)",
      itemName: "Achinoam Friedlander",
      owner: "Achinoam Friedlander",
    }),
    gregorianMonthDay: { month: 8, day: 20 },
    hebrewMonthDay: { month: 7, day: 5 },
  });

  assert.equal(merged.length, 2);
  assert.deepEqual(
    merged.map((r) => r.id),
    ["birthday-gregorian-m1", "birthday-hebrew-m1"],
  );
  assert.equal(merged[0]!.renewalType, "");
  assert.equal(merged[0]!.extraEmailSegments, undefined);
});

test("consolidateDualCalendarRows keeps both when both calendars upcoming", async () => {
  const { consolidateDualCalendarRowsForTest } = await import("@/lib/family-events/upcoming");
  const today = new Date(2026, 5, 11);
  const merged = consolidateDualCalendarRowsForTest({
    today,
    language: "en",
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
    gregorianMonthDay: { month: 5, day: 30 },
    hebrewMonthDay: { month: 3, day: 27 },
  });

  assert.equal(merged.length, 2);
});
