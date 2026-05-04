import test from "node:test";
import assert from "node:assert/strict";
import {
  expandTwoDigitYear,
  formatFilledAtForForm,
  parseFilledAtFromForm,
} from "@/lib/petrol-fillup-filled-at";

test("expandTwoDigitYear maps 25 to 2025", () => {
  assert.equal(expandTwoDigitYear(25), 2025);
  assert.equal(expandTwoDigitYear(69), 2069);
  assert.equal(expandTwoDigitYear(70), 1970);
  assert.equal(expandTwoDigitYear(99), 1999);
});

test("formatFilledAtForForm DMY", () => {
  assert.equal(formatFilledAtForForm("2025-07-01", "DMY"), "01/07/2025");
});

test("parseFilledAtFromForm DMY accepts dd/mm/yyyy and 2-digit year", () => {
  const r = parseFilledAtFromForm("15/03/25", "DMY");
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.isoYmd, "2025-03-15");
  }
});

test("parseFilledAtFromForm rejects garbage year", () => {
  const r = parseFilledAtFromForm("01/07/25202", "DMY");
  assert.equal(r.ok, false);
});

test("parseFilledAtFromForm accepts ISO on any household format setting", () => {
  const r = parseFilledAtFromForm("2024-06-10", "MDY");
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.isoYmd, "2024-06-10");
});
