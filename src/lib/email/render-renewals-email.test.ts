import assert from "node:assert/strict";
import test from "node:test";
import { renewalEmailLineSegments } from "@/lib/email/renewal-email-line";
import type { RenewalRow } from "@/lib/upcoming-renewals/compute";

function familyRow(partial: Partial<RenewalRow> & Pick<RenewalRow, "renewalType">): RenewalRow {
  return {
    id: "anniversary-gregorian-m1",
    category: "Anniversary",
    itemName: "A & B",
    owner: "Household",
    ownerId: null,
    renewalDate: new Date(2026, 5, 21),
    href: "/dashboard/family-members/marriages",
    ...partial,
  };
}

test("renewalEmailLineSegments omits redundant type and Household", () => {
  assert.deepEqual(renewalEmailLineSegments(familyRow({ renewalType: "Anniversary" })), ["A & B"]);
  assert.deepEqual(
    renewalEmailLineSegments(
      familyRow({
        renewalType: "Hebrew: 12 Tammuz 5786 (Fri night-Sat 26/06/2026-27/06/2026)",
      }),
    ),
    ["A & B", "Hebrew: 12 Tammuz 5786 (Fri night-Sat 26/06/2026-27/06/2026)"],
  );
});

test("renewalEmailLineSegments shows event type for special dates", () => {
  const specialDateRow = (partial: Partial<RenewalRow> & Pick<RenewalRow, "renewalType">): RenewalRow => ({
    id: "special-date-gregorian-s1",
    category: "Special date",
    itemName: "Grandfather Moshe",
    owner: "Grandfather Moshe",
    ownerId: null,
    renewalDate: new Date(2026, 5, 10),
    href: "/dashboard/family-members/special-dates/s1/edit",
    ...partial,
  });

  assert.deepEqual(
    renewalEmailLineSegments(specialDateRow({ renewalType: "Death" })),
    ["Grandfather Moshe", "Death"],
  );
  assert.deepEqual(
    renewalEmailLineSegments(
      specialDateRow({
        renewalType: "Hebrew: 28 Sivan 5786 (Fri night-Sat 12/06/2026-13/06/2026)",
      }),
    ),
    ["Grandfather Moshe", "Hebrew: 28 Sivan 5786 (Fri night-Sat 12/06/2026-13/06/2026)"],
  );
});
