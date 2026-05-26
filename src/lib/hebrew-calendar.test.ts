import test from "node:test";
import assert from "node:assert/strict";
import {
  gregorianDateToHebrewComponents,
  hebrewComponentsToGregorian,
  nextGregorianOccurrenceForHebrewMonthDay,
  nextAnnualGregorianOccurrence,
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
