import assert from "node:assert/strict";
import test from "node:test";
import { renewalEmailLineSegments } from "@/lib/email/renewal-email-line";
import { renderRenewalsEmail } from "@/lib/email/render-renewals-email";
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

test("renewalEmailLineSegments includes years since when present", () => {
  assert.deepEqual(
    renewalEmailLineSegments(familyRow({ renewalType: "Anniversary", yearsSince: 12 })),
    ["A & B", "12 years"],
  );
  assert.deepEqual(
    renewalEmailLineSegments(familyRow({ renewalType: "Anniversary", yearsSince: 1 }), "he"),
    ["A & B", "שנה אחת"],
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
        renewalType: "Death",
        yearsSince: 10,
        extraEmailSegments: [
          "Hebrew: 28 Sivan 5786 (Fri night-Sat 12/06/2026-13/06/2026)",
        ],
      }),
    ),
    [
      "Grandfather Moshe",
      "10 years",
      "Death",
      "Hebrew: 28 Sivan 5786 (Fri night-Sat 12/06/2026-13/06/2026)",
    ],
  );
  assert.deepEqual(
    renewalEmailLineSegments(
      specialDateRow({
        renewalType: "Hebrew: 28 Sivan 5786 (Fri night-Sat 12/06/2026-13/06/2026)",
      }),
    ),
    ["Grandfather Moshe", "Hebrew: 28 Sivan 5786 (Fri night-Sat 12/06/2026-13/06/2026)"],
  );
  assert.deepEqual(
    renewalEmailLineSegments(
      specialDateRow({
        renewalType: "Death; Hebrew: 28 Sivan 5786 (Fri night-Sat 12/06/2026-13/06/2026)",
      }),
    ),
    ["Grandfather Moshe", "Death; Hebrew: 28 Sivan 5786 (Fri night-Sat 12/06/2026-13/06/2026)"],
  );
});

function layoutRow(partial: Partial<RenewalRow> & Pick<RenewalRow, "id" | "category" | "itemName" | "renewalDate">): RenewalRow {
  return {
    owner: "Household",
    ownerId: null,
    renewalType: "Annual",
    href: "/dashboard/upcoming-renewals",
    ...partial,
  };
}

test("renderRenewalsEmail grouped headings stay in category order and flat lists by date", () => {
  const today = new Date(2026, 9, 4);
  const rows = [
    layoutRow({
      id: "sub",
      category: "Subscription",
      itemName: "Netflix",
      renewalDate: new Date(2026, 9, 5),
    }),
    layoutRow({
      id: "bday-late",
      category: "Birthday",
      itemName: "Ada",
      renewalDate: new Date(2026, 9, 10),
      renewalType: "Birthday",
    }),
    layoutRow({
      id: "ins",
      category: "Insurance",
      itemName: "Policy A",
      renewalDate: new Date(2026, 9, 1),
    }),
    layoutRow({
      id: "bday-same",
      category: "Birthday",
      itemName: "Bea",
      renewalDate: new Date(2026, 9, 5),
      renewalType: "Birthday",
    }),
  ];
  const shared = {
    rows,
    dateDisplayFormat: "YMD" as const,
    language: "en" as const,
    baseUrl: "https://example.test",
    daysAhead: 30,
    today,
  };

  const grouped = renderRenewalsEmail({ ...shared, layout: "grouped" });
  const birthdayHeading = grouped.html.indexOf(">Birthday</h2>");
  const subscriptionHeading = grouped.html.indexOf(">Subscription</h2>");
  const insuranceHeading = grouped.html.indexOf(">Insurance</h2>");
  assert.ok(birthdayHeading >= 0 && subscriptionHeading > birthdayHeading && insuranceHeading > subscriptionHeading);
  assert.equal(grouped.text.includes(" · Birthday · "), false);

  const flat = renderRenewalsEmail({ ...shared, layout: "flat" });
  assert.equal(flat.html.includes("<h2"), false);
  assert.ok(flat.html.includes('style="color:#be185d;font-weight:600;">Birthday</span>'));
  assert.ok(flat.html.includes('style="color:#0369a1;font-weight:600;">Subscription</span>'));
  const policyAt = flat.text.indexOf("Policy A");
  const beaAt = flat.text.indexOf("Bea");
  const netflixAt = flat.text.indexOf("Netflix");
  const adaAt = flat.text.indexOf("Ada");
  assert.ok(policyAt >= 0 && beaAt > policyAt && netflixAt > beaAt && adaAt > netflixAt);
  assert.ok(flat.text.includes(" · Birthday · Bea"));
  assert.ok(flat.text.includes(" · Subscription · Annual · Netflix"));
  assert.ok(flat.text.includes(" · Insurance · Annual · Policy A"));
});
