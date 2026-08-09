import test from "node:test";
import assert from "node:assert/strict";
import {
  gregorianDateToHebrewComponents,
  gregorianLocalDateToHebrewComponents,
  hebrewComponentsToGregorian,
  nextGregorianOccurrenceForHebrewMonthDay,
  nextAnnualGregorianOccurrence,
  formatHebrewNightDayRangeLabel,
  formatHebrewOccurrenceLabel,
  passedHebrewOccurrenceThisCycle,
  passedGregorianOccurrenceThisCycle,
} from "@/lib/hebrew-calendar";

test("gregorianDateToHebrewComponents uses UTC calendar date", () => {
  const d = new Date(Date.UTC(1990, 2, 15));
  const h = gregorianDateToHebrewComponents(d);
  assert.equal(h.day, 18);
  assert.equal(h.month, 12);
  assert.equal(h.year, 5750);
});

test("hebrewComponentsToGregorian preserves Hebrew day/month", async () => {
  const { HDate } = await import("@hebcal/hdate");
  const g = hebrewComponentsToGregorian({ day: 18, month: 12, year: 5750 });
  const h = new HDate(g);
  assert.equal(h.getDate(), 18);
  assert.equal(h.getMonth(), 12);
  assert.equal(h.getFullYear(), 5750);
});

test("nextGregorianOccurrenceForHebrewMonthDay finds upcoming occurrence", () => {
  const from = new Date(2026, 4, 1);
  const next = nextGregorianOccurrenceForHebrewMonthDay({ month: 7, day: 1, fromDate: from });
  assert.ok(next);
  assert.ok(next >= from);
});

test("nextAnnualGregorianOccurrence rolls to next year", () => {
  const from = new Date(2026, 11, 20);
  const next = nextAnnualGregorianOccurrence(2, 15, from);
  assert.equal(next.getFullYear(), 2027);
  assert.equal(next.getMonth(), 2);
  assert.equal(next.getDate(), 15);
});

test("formatHebrewOccurrenceLabel matches renewals email format", () => {
  const d = new Date(2026, 7, 20); // 20 Aug 2026
  const label = formatHebrewOccurrenceLabel("en", d);
  assert.match(label, /^Hebrew: \d+ \w+ \d{4} \(/);
  assert.match(label, /20\/08\/2026/);
  assert.equal(
    formatHebrewOccurrenceLabel("en", d, { month: 6, day: 7 }),
    `Hebrew: 7 Elul ${gregorianLocalDateToHebrewComponents(d).year} (${formatHebrewNightDayRangeLabel("en", d)})`,
  );
});

test("passedHebrewOccurrenceThisCycle returns date when already passed", () => {
  const today = new Date(2026, 5, 11);
  const passed = passedHebrewOccurrenceThisCycle(3, 23, today);
  assert.ok(passed);
  assert.equal(passed.getFullYear(), 2026);
  assert.equal(passed.getMonth(), 5);
  assert.equal(passed.getDate(), 8);
});

test("passedHebrewOccurrenceThisCycle returns null when still upcoming", () => {
  const today = new Date(2026, 5, 11);
  const passed = passedHebrewOccurrenceThisCycle(3, 27, today);
  assert.equal(passed, null);
});

test("passedGregorianOccurrenceThisCycle returns date when already passed", () => {
  const today = new Date(2026, 5, 15);
  const passed = passedGregorianOccurrenceThisCycle(5, 12, today);
  assert.ok(passed);
  assert.equal(passed.getDate(), 12);
  assert.equal(passed.getMonth(), 5);
});
