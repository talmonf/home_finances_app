import test from "node:test";
import assert from "node:assert/strict";
import { resolveHebrewDobForSave } from "@/lib/family-members/hebrew-dob-form";

test("resolveHebrewDobForSave derives Hebrew from Gregorian when empty", () => {
  const dob = new Date(Date.UTC(1990, 2, 15));
  const resolved = resolveHebrewDobForSave(
    {
      hebrew_date_of_birth_day: null,
      hebrew_date_of_birth_month: null,
      hebrew_date_of_birth_year: null,
    },
    dob,
  );
  assert.equal(resolved.hebrew_date_of_birth_day, 18);
  assert.equal(resolved.hebrew_date_of_birth_month, 12);
  assert.equal(resolved.hebrew_date_of_birth_year, 5750);
});
