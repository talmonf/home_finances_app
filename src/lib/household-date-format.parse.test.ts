import assert from "node:assert/strict";
import test from "node:test";
import { parseHouseholdDateInputToIsoYmd } from "@/lib/household-date-format";

test("DMY accepts 8 digits without separators", () => {
  assert.equal(parseHouseholdDateInputToIsoYmd("15102027", "DMY"), "2027-10-15");
  assert.equal(parseHouseholdDateInputToIsoYmd("15/10/2027", "DMY"), "2027-10-15");
});

test("MDY and YMD read the same 8 digits in household order", () => {
  assert.equal(parseHouseholdDateInputToIsoYmd("10152027", "MDY"), "2027-10-15");
  assert.equal(parseHouseholdDateInputToIsoYmd("20271015", "YMD"), "2027-10-15");
});

test("compact digits that are not a real calendar day stay invalid", () => {
  assert.equal(parseHouseholdDateInputToIsoYmd("32102027", "DMY"), null);
  assert.equal(parseHouseholdDateInputToIsoYmd("29022025", "DMY"), null);
  assert.equal(parseHouseholdDateInputToIsoYmd("29022024", "DMY"), "2024-02-29");
});
