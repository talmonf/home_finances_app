import test from "node:test";
import assert from "node:assert/strict";
import { getVisibleHomeFrequentLinks } from "@/lib/home-frequent-links";

test("shows RiseUp import when toggled on even if Import statements section is disabled", () => {
  const enabledBySectionId = new Map<string, boolean>([["importStatements", false]]);

  const links = getVisibleHomeFrequentLinks({
    rawJson: {
      privateClinic: false,
      reportTreatment: false,
      reportReceipt: false,
      upcomingVisits: false,
      upcomingAppointments: false,
      upcomingRenewals: false,
      riseUpImport: true,
    },
    enabledBySectionId,
    language: "en",
  });

  assert.deepEqual(
    links.map((l) => l.key),
    ["riseUpImport"],
  );
  assert.equal(links[0]?.href, "/dashboard/import?format=riseup");
});

test("still gates clinic and renewals links on their sections", () => {
  const enabledBySectionId = new Map<string, boolean>([
    ["privateClinic", false],
    ["upcomingRenewals", true],
  ]);

  const links = getVisibleHomeFrequentLinks({
    rawJson: {
      privateClinic: true,
      reportTreatment: true,
      upcomingRenewals: true,
      riseUpImport: true,
    },
    enabledBySectionId,
    language: "en",
  });

  assert.deepEqual(links.map((l) => l.key), ["upcomingRenewals", "riseUpImport"]);
});
