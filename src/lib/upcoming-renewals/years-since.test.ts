import assert from "node:assert/strict";
import test from "node:test";
import {
  formatYearsSinceLabel,
  yearsSinceGregorian,
  yearsSinceHebrew,
} from "@/lib/upcoming-renewals/years-since";

test("yearsSinceGregorian uses occurrence year minus original year", () => {
  assert.equal(
    yearsSinceGregorian(new Date(1984, 2, 15), new Date(2026, 2, 15)),
    42,
  );
  assert.equal(
    yearsSinceGregorian(new Date(2025, 11, 1), new Date(2026, 11, 1)),
    1,
  );
});

test("yearsSinceHebrew uses Hebrew year of the occurrence", () => {
  // 15 Adar 5750 → occurrence around early March 2026 is Hebrew year 5786 → 36 years
  const years = yearsSinceHebrew(5750, new Date(2026, 2, 5));
  assert.equal(years, 36);
});

test("formatYearsSinceLabel localizes", () => {
  assert.equal(formatYearsSinceLabel(1, "en"), "1 year");
  assert.equal(formatYearsSinceLabel(12, "en"), "12 years");
  assert.equal(formatYearsSinceLabel(1, "he"), "שנה אחת");
  assert.equal(formatYearsSinceLabel(12, "he"), "12 שנים");
});
