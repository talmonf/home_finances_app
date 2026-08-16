import test from "node:test";
import assert from "node:assert/strict";
import { renderClinicDigestEmail } from "@/lib/email/render-clinic-digest-email";

const copy = {
  sectionAppointments: "Appointments",
  sectionVisits: "Upcoming visits",
  sectionNeedsFirstVisit: "Needs first visit",
  sectionNeedsFirstVisitHint: "Hint",
  colStart: "Start",
  colClient: "Client",
  colJob: "Job",
  colVisitType: "Type",
  colNextDue: "Next due",
  colLastVisit: "Last",
  colProgram: "Program",
  overdue: "Overdue",
  dueToday: "Today",
  scheduledOn: (d: string) => `Scheduled ${d}`,
  noneAppointments: "No appointments",
  noneVisits: "No visits",
  allClear: "All clear",
  openAppointments: "Open appointments",
  openUpcomingVisits: "Open visits",
};

test("renderClinicDigestEmail subject includes clinic branding and counts", () => {
  const { subject, html } = renderClinicDigestEmail({
    data: {
      appointments: [
        {
          id: "1",
          startAt: new Date("2026-06-10T10:00:00Z"),
          clientName: "Ada",
          jobLabel: "Therapy",
          visitType: "clinic",
          note: null,
        },
      ],
      visits: [],
      needsFirstVisit: [],
    },
    dateDisplayFormat: "DMY",
    language: "en",
    baseUrl: "https://example.com",
    daysAhead: 90,
    copy,
  });
  assert.match(subject, /Clinic:/);
  assert.match(subject, /1 appointments/);
  assert.ok(html.includes("Ada"));
  assert.ok(html.includes("private-clinic/appointments"));
});

test("renderClinicDigestEmail includes appointment and visit notes", () => {
  const { html, text } = renderClinicDigestEmail({
    data: {
      appointments: [
        {
          id: "1",
          startAt: new Date("2026-06-10T10:00:00Z"),
          clientName: "Ada",
          jobLabel: "Therapy",
          visitType: "clinic",
          note: "Bring intake forms",
        },
      ],
      visits: [
        {
          clientId: "c1",
          name: "Ada",
          jobLabel: "Therapy",
          programLabel: "Hospice",
          kupatHolimLabel: "None",
          familyName: null,
          lastVisit: new Date("2026-06-01T00:00:00Z"),
          nextDue: new Date("2026-06-08T00:00:00Z"),
          onHold: false,
          isOverdue: false,
          isDueToday: false,
          nextAppointment: {
            id: "1",
            startAt: new Date("2026-06-10T10:00:00Z"),
            note: "Bring intake forms",
          },
        },
      ],
      needsFirstVisit: [],
    },
    dateDisplayFormat: "DMY",
    language: "en",
    baseUrl: "https://example.com",
    daysAhead: 90,
    copy,
  });
  assert.ok(html.includes("Bring intake forms"));
  assert.match(text, /Bring intake forms/);
});

test("renderClinicDigestEmail Hebrew uses rtl", () => {
  const { subject, html } = renderClinicDigestEmail({
    data: { appointments: [], visits: [], needsFirstVisit: [] },
    dateDisplayFormat: "DMY",
    language: "he",
    baseUrl: "https://example.com",
    daysAhead: 90,
    copy: { ...copy, allClear: "הכול נקי" },
  });
  assert.match(subject, /מרפאה:/);
  assert.ok(html.includes('dir="rtl"'));
  assert.ok(html.includes("הכול נקי"));
});
