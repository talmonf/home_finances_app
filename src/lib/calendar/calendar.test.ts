import assert from "node:assert/strict";
import test from "node:test";
import {
  annualDateInRange,
  calendarRenewalRows,
  isoDateLocal,
  overdueVisitsForStrip,
  pinsInVisibleRange,
  selectUnscheduledVisits,
  daysForView,
  monthlyOccurrencesInRange,
} from "@/lib/calendar/model";

const today = new Date(2026, 9, 7);

test("unscheduled visits omit clients who already have an upcoming appointment", () => {
  const pins = selectUnscheduledVisits(
    [
      {
        clientId: "scheduled",
        onHold: false,
        cadenceDue: new Date(2026, 9, 10),
        hasUpcomingAppointment: true,
      },
      {
        clientId: "estimated",
        onHold: false,
        cadenceDue: new Date(2026, 9, 12),
        hasUpcomingAppointment: false,
      },
      {
        clientId: "held",
        onHold: true,
        cadenceDue: new Date(2026, 9, 12),
        hasUpcomingAppointment: false,
      },
      {
        clientId: "needs-first",
        onHold: false,
        cadenceDue: null,
        hasUpcomingAppointment: false,
      },
    ],
    today,
  );
  assert.deepEqual(
    pins.map((pin) => pin.clientId),
    ["estimated"],
  );
  assert.equal(isoDateLocal(pins[0]!.due), "2026-10-12");
  assert.equal(pins[0]!.overdue, false);
});

test("overdue unscheduled visits stay on their due date and appear in the strip when today is visible", () => {
  const pins = selectUnscheduledVisits(
    [
      {
        clientId: "late",
        onHold: false,
        cadenceDue: new Date(2026, 8, 1),
        hasUpcomingAppointment: false,
      },
    ],
    today,
  );
  assert.equal(pins[0]!.overdue, true);
  assert.equal(isoDateLocal(pins[0]!.due), "2026-09-01");

  const thisWeek = daysForView("week", today);
  assert.equal(pinsInVisibleRange(pins, thisWeek).length, 0);
  assert.equal(overdueVisitsForStrip(pins, thisWeek, today).length, 1);

  const dueWeek = daysForView("week", new Date(2026, 8, 1));
  assert.equal(pinsInVisibleRange(pins, dueWeek).length, 1);
  assert.equal(overdueVisitsForStrip(pins, dueWeek, today).length, 0);

  const futureMonth = daysForView("month", new Date(2027, 2, 15));
  assert.equal(pinsInVisibleRange(pins, futureMonth).length, 0);
  assert.equal(overdueVisitsForStrip(pins, futureMonth, today).length, 0);
});

test("calendar renewals drop family dates and tasks and keep in-range rows", () => {
  const inRange = new Date(2026, 9, 15);
  const outside = new Date(2026, 11, 1);
  const rows = calendarRenewalRows(
    [
      { id: "birthday", category: "Birthday", renewalDate: inRange },
      { id: "anniversary", category: "Anniversary", renewalDate: inRange },
      { id: "special", category: "Special date", renewalDate: inRange },
      { id: "task", category: "Task", renewalDate: inRange },
      { id: "sub", category: "Subscription", renewalDate: inRange },
      { id: "later", category: "Insurance", renewalDate: outside },
    ],
    new Date(2026, 9, 1),
    new Date(2026, 9, 31),
  );
  assert.deepEqual(
    rows.map((row) => row.id),
    ["sub"],
  );
});

test("annual and monthly occurrences fall inside a past month and a future month", () => {
  const past = annualDateInRange(2, 15, new Date(2024, 2, 1), new Date(2024, 2, 31));
  assert.equal(past && isoDateLocal(past), "2024-03-15");

  const future = annualDateInRange(2, 15, new Date(2027, 2, 1), new Date(2027, 2, 31));
  assert.equal(future && isoDateLocal(future), "2027-03-15");

  assert.equal(annualDateInRange(2, 15, new Date(2026, 3, 1), new Date(2026, 3, 30)), null);

  const monthly = monthlyOccurrencesInRange(1, new Date(2026, 9, 1), new Date(2026, 10, 8));
  assert.deepEqual(
    monthly.map((d) => isoDateLocal(d)),
    ["2026-10-01", "2026-11-01"],
  );
});
