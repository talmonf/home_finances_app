import test from "node:test";
import assert from "node:assert/strict";
import type { ClinicDigestData } from "@/lib/private-clinic/compute-clinic-digest";
import { endOfDaysAheadWindow } from "@/lib/digest-email/schedule";

function digestItemCount(data: ClinicDigestData): number {
  return data.appointments.length + data.visits.length + data.needsFirstVisit.length;
}

test("digestItemCount sums appointments, visits, and needs-first-visit", () => {
  const data: ClinicDigestData = {
    appointments: [{ id: "a1" } as ClinicDigestData["appointments"][0]],
    visits: [{ clientId: "c1" } as ClinicDigestData["visits"][0]],
    needsFirstVisit: [{ clientId: "c2", name: "X", nextAppointment: null }],
  };
  assert.equal(digestItemCount(data), 3);
});

test("endOfDaysAheadWindow extends calendar days in timezone", () => {
  const start = new Date("2026-06-04T12:00:00Z");
  const end = endOfDaysAheadWindow(start, 7, "Asia/Jerusalem");
  assert.ok(end.getTime() > start.getTime());
});
