import assert from "node:assert/strict";
import test from "node:test";
import { formatCreditCardOptionLabel } from "@/lib/credit-card-label";

test("credit card label puts the holder's first name before the last 4 digits", () => {
  assert.equal(
    formatCreditCardOptionLabel({
      card_name: "Flycard (Isracard)",
      card_last_four: "2030",
      family_member: { full_name: "Tal Cohen" },
    }),
    "Flycard (Isracard) Tal 2030",
  );
  assert.equal(
    formatCreditCardOptionLabel({
      card_name: "Flycard",
      card_last_four: "2030",
      family_member: { full_name: "דוד כהן" },
    }),
    "Flycard דוד 2030",
  );
});

test("credit card label omits a missing holder or missing part", () => {
  assert.equal(
    formatCreditCardOptionLabel({ card_name: "Flycard", card_last_four: "2030" }),
    "Flycard 2030",
  );
  assert.equal(
    formatCreditCardOptionLabel({
      card_name: "Flycard",
      card_last_four: "2030",
      family_member: null,
    }),
    "Flycard 2030",
  );
  assert.equal(formatCreditCardOptionLabel({ card_name: "Flycard", card_last_four: "" }), "Flycard");
  assert.equal(
    formatCreditCardOptionLabel({ card_name: "  ", card_last_four: "2030", family_member: { full_name: "Tal" } }),
    "Tal 2030",
  );
});
