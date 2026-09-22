import test from "node:test";
import assert from "node:assert/strict";
import { buildDesiredFamilyCalendarEvents, liveFamilyCalendarSourceKeys } from "@/lib/family-calendar-sync/desired";
import {
  familyCalendarLiveSourceKey,
  familyCalendarSyncKey,
  formatLocalIsoDate,
  hebrewEveningDateTimes,
  isAnnualSpecialDate,
  previousIsoCalendarDay,
  YEARLY_OCCURRENCE_KEY,
} from "@/lib/family-calendar-sync/keys";
import { shouldSendFamilyCalendarFailureEmail, renderFamilyCalendarFailureEmail } from "@/lib/family-calendar-sync/notify";
import { isFamilyCalendarSyncEligible } from "@/lib/family-calendar-sync/eligibility";
import { isGoogleInvalidGrant } from "@/lib/google-calendar/errors";
import { planFamilyCalendarReconcile } from "@/lib/family-calendar-sync/reconcile";
import { hebrewComponentsToGregorian, nextGregorianOccurrenceForHebrewMonthDay } from "@/lib/hebrew-calendar";

const BASE = "https://example.test";

test("isAnnualSpecialDate treats death and other as annual, lifecycle events as one-time", () => {
  assert.equal(isAnnualSpecialDate("death"), true);
  assert.equal(isAnnualSpecialDate("other"), true);
  assert.equal(isAnnualSpecialDate("bar_mitzvah"), false);
  assert.equal(isAnnualSpecialDate("bat_mitzvah"), false);
  assert.equal(isAnnualSpecialDate("engagement"), false);
  assert.equal(isAnnualSpecialDate("aliyah"), false);
  assert.equal(isAnnualSpecialDate("graduation"), false);
});

test("gregorian birthday uses yearly occurrence key without age in the title", () => {
  const events = buildDesiredFamilyCalendarEvents({
    today: new Date(2026, 8, 17),
    language: "en",
    baseUrl: BASE,
    household: {
      members: [
        {
          id: "m1",
          full_name: "Dana",
          is_active: true,
          date_of_birth: new Date(Date.UTC(1990, 2, 15)),
          hebrew_date_of_birth_day: null,
          hebrew_date_of_birth_month: null,
          hebrew_date_of_birth_year: null,
        },
      ],
      marriages: [],
      specialDates: [],
    },
  });
  assert.equal(events.length, 1);
  assert.equal(events[0]!.occurrenceKey, YEARLY_OCCURRENCE_KEY);
  assert.equal(events[0]!.recurringYearly, true);
  assert.equal(events[0]!.startDate, "1990-03-15");
  assert.equal(events[0]!.allDay, true);
  assert.equal(events[0]!.summary, "Birthday: Dana");
  assert.equal(familyCalendarSyncKey(events[0]!), "birthday:m1:gregorian:yearly");
  assert.match(events[0]!.description, /This year: \d+ years/);
});

test("hebrew birthday occurrence key is the next civil date and rolls over after it passes", () => {
  const before = new Date(2026, 4, 1);
  const next = nextGregorianOccurrenceForHebrewMonthDay({
    month: 7,
    day: 1,
    fromDate: before,
  });
  assert.ok(next);
  const household = {
    members: [
      {
        id: "m1",
        full_name: "Dana",
        is_active: true,
        date_of_birth: null,
        hebrew_date_of_birth_day: 1,
        hebrew_date_of_birth_month: 7,
        hebrew_date_of_birth_year: 5750,
      },
    ],
    marriages: [],
    specialDates: [],
  };
  const upcoming = buildDesiredFamilyCalendarEvents({
    today: before,
    language: "en",
    baseUrl: BASE,
    household,
  });
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0]!.calendarKind, "hebrew");
  assert.equal(upcoming[0]!.occurrenceKey, formatLocalIsoDate(next));
  assert.equal(upcoming[0]!.allDay, false);
  assert.equal(upcoming[0]!.startDate, previousIsoCalendarDay(formatLocalIsoDate(next)));
  assert.equal(upcoming[0]!.recurringYearly, false);
  assert.match(upcoming[0]!.summary, /^Birthday: Dana · Hebrew:/);

  const onEvening = new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1);
  const stillThisYear = buildDesiredFamilyCalendarEvents({
    today: onEvening,
    language: "en",
    baseUrl: BASE,
    household,
  });
  assert.equal(stillThisYear[0]!.occurrenceKey, upcoming[0]!.occurrenceKey);
  assert.equal(stillThisYear[0]!.startDate, formatLocalIsoDate(onEvening));

  const onCivilDay = new Date(next.getFullYear(), next.getMonth(), next.getDate());
  const rolledOnCivil = buildDesiredFamilyCalendarEvents({
    today: onCivilDay,
    language: "en",
    baseUrl: BASE,
    household,
  });
  assert.notEqual(rolledOnCivil[0]!.occurrenceKey, upcoming[0]!.occurrenceKey);

  const dayAfter = new Date(next.getFullYear(), next.getMonth(), next.getDate() + 1);
  const rolled = buildDesiredFamilyCalendarEvents({
    today: dayAfter,
    language: "en",
    baseUrl: BASE,
    household,
  });
  assert.equal(rolled.length, 1);
  assert.equal(rolled[0]!.occurrenceKey, rolledOnCivil[0]!.occurrenceKey);
  const nextYear = nextGregorianOccurrenceForHebrewMonthDay({
    month: 7,
    day: 1,
    fromDate: dayAfter,
  });
  assert.ok(nextYear);
  assert.equal(rolled[0]!.occurrenceKey, formatLocalIsoDate(nextYear));
});

test("hebrew 13 Tishrei 5787 is Wednesday 23/09/2026 18:00-20:00, not all-day Thursday", () => {
  const civil = hebrewComponentsToGregorian({ day: 13, month: 7, year: 5787 });
  assert.equal(formatLocalIsoDate(civil), "2026-09-24");
  assert.deepEqual(hebrewEveningDateTimes("2026-09-24"), {
    eveningDate: "2026-09-23",
    startDateTime: "2026-09-23T18:00:00",
    endDateTime: "2026-09-23T20:00:00",
  });

  const events = buildDesiredFamilyCalendarEvents({
    today: new Date(2026, 8, 23),
    language: "en",
    baseUrl: BASE,
    household: {
      members: [
        {
          id: "m1",
          full_name: "Talmon Friedlander",
          is_active: true,
          date_of_birth: null,
          hebrew_date_of_birth_day: 13,
          hebrew_date_of_birth_month: 7,
          hebrew_date_of_birth_year: 5787,
        },
      ],
      marriages: [],
      specialDates: [],
    },
  });
  assert.equal(events.length, 1);
  assert.equal(events[0]!.allDay, false);
  assert.equal(events[0]!.recurringYearly, false);
  assert.equal(events[0]!.occurrenceKey, "2026-09-24");
  assert.equal(events[0]!.startDate, "2026-09-23");
  assert.match(events[0]!.summary, /13 Tishrei 5787/);
  assert.match(events[0]!.summary, /Wed night-Thu 23\/09\/2026-24\/09\/2026/);
});

test("one-time special dates skip the past and do not recur; death stays yearly", () => {
  const today = new Date(2026, 8, 17);
  const events = buildDesiredFamilyCalendarEvents({
    today,
    language: "en",
    baseUrl: BASE,
    household: {
      members: [],
      marriages: [],
      specialDates: [
        {
          id: "grad-past",
          display_name: "Sam",
          event_type: "graduation",
          event_type_other: null,
          gregorian_date: new Date(Date.UTC(2020, 5, 1)),
          hebrew_day: null,
          hebrew_month: null,
          hebrew_year: null,
          family_member: null,
        },
        {
          id: "grad-future",
          display_name: "Sam",
          event_type: "graduation",
          event_type_other: null,
          gregorian_date: new Date(Date.UTC(2027, 5, 1)),
          hebrew_day: null,
          hebrew_month: null,
          hebrew_year: null,
          family_member: null,
        },
        {
          id: "yahrzeit",
          display_name: "Leah",
          event_type: "death",
          event_type_other: null,
          gregorian_date: new Date(Date.UTC(2010, 0, 20)),
          hebrew_day: null,
          hebrew_month: null,
          hebrew_year: null,
          family_member: null,
        },
      ],
    },
  });
  const byId = new Map(events.map((e) => [`${e.sourceId}:${e.calendarKind}`, e]));
  assert.equal(byId.has("grad-past:gregorian"), false);
  assert.equal(byId.get("grad-future:gregorian")?.recurringYearly, false);
  assert.equal(byId.get("grad-future:gregorian")?.occurrenceKey, "2027-06-01");
  assert.equal(byId.get("yahrzeit:gregorian")?.recurringYearly, true);
  assert.equal(byId.get("yahrzeit:gregorian")?.occurrenceKey, YEARLY_OCCURRENCE_KEY);
});

test("inactive family members are omitted from desired events and live source keys", () => {
  const household = {
    members: [
      {
        id: "m1",
        full_name: "Dana",
        is_active: false,
        date_of_birth: new Date(Date.UTC(1990, 2, 15)),
        hebrew_date_of_birth_day: null,
        hebrew_date_of_birth_month: null,
        hebrew_date_of_birth_year: null,
      },
    ],
    marriages: [],
    specialDates: [],
  };
  const events = buildDesiredFamilyCalendarEvents({
    today: new Date(2026, 8, 17),
    language: "en",
    baseUrl: BASE,
    household,
  });
  assert.equal(events.length, 0);
  assert.equal(liveFamilyCalendarSourceKeys(household).has(familyCalendarLiveSourceKey("birthday", "m1")), false);
});

test("reconcile reuses the stored Google event id instead of inserting again", () => {
  const desired = buildDesiredFamilyCalendarEvents({
    today: new Date(2026, 8, 17),
    language: "en",
    baseUrl: BASE,
    household: {
      members: [
        {
          id: "m1",
          full_name: "Dana",
          is_active: true,
          date_of_birth: new Date(Date.UTC(1990, 2, 15)),
          hebrew_date_of_birth_day: null,
          hebrew_date_of_birth_month: null,
          hebrew_date_of_birth_year: null,
        },
      ],
      marriages: [],
      specialDates: [],
    },
  });
  const plan = planFamilyCalendarReconcile({
    desired,
    liveSourceKeys: new Set([familyCalendarLiveSourceKey("birthday", "m1")]),
    today: new Date(2026, 8, 17),
    existing: [
      {
        id: "map-1",
        sourceKind: "birthday",
        sourceId: "m1",
        calendarKind: "gregorian",
        occurrenceKey: YEARLY_OCCURRENCE_KEY,
        googleEventId: "gcal-existing",
      },
    ],
  });
  assert.equal(plan.upserts.length, 1);
  assert.equal(plan.upserts[0]!.existingEventId, "gcal-existing");
  assert.equal(plan.upserts[0]!.mappingId, "map-1");
  assert.equal(plan.deletes.length, 0);
});

test("reconcile keeps past Hebrew occurrences and deletes stale future ones", () => {
  const today = new Date(2026, 8, 17);
  const live = new Set([familyCalendarLiveSourceKey("birthday", "m1")]);
  const plan = planFamilyCalendarReconcile({
    today,
    liveSourceKeys: live,
    desired: [
      {
        sourceKind: "birthday",
        sourceId: "m1",
        calendarKind: "hebrew",
        occurrenceKey: "2027-03-11",
        startDate: "2027-03-10",
        recurringYearly: false,
        allDay: false,
        summary: "Birthday: Dana",
        description: "",
      },
    ],
    existing: [
      {
        id: "past",
        sourceKind: "birthday",
        sourceId: "m1",
        calendarKind: "hebrew",
        occurrenceKey: "2026-03-22",
        googleEventId: "gcal-past",
      },
      {
        id: "stale",
        sourceKind: "birthday",
        sourceId: "m1",
        calendarKind: "hebrew",
        occurrenceKey: "2026-10-01",
        googleEventId: "gcal-stale",
      },
    ],
  });
  assert.deepEqual(
    plan.keeps.map((row) => row.id),
    ["past"],
  );
  assert.deepEqual(
    plan.deletes.map((row) => row.id),
    ["stale"],
  );
  assert.equal(plan.upserts[0]!.existingEventId, null);
});

test("reconcile deletes all mappings when the source is no longer live", () => {
  const plan = planFamilyCalendarReconcile({
    today: new Date(2026, 8, 17),
    liveSourceKeys: new Set(),
    desired: [],
    existing: [
      {
        id: "past",
        sourceKind: "birthday",
        sourceId: "m1",
        calendarKind: "hebrew",
        occurrenceKey: "2026-03-22",
        googleEventId: "gcal-past",
      },
    ],
  });
  assert.equal(plan.keeps.length, 0);
  assert.equal(plan.deletes.length, 1);
});

test("failure email cooldown is 24 hours and resets when there are no failures", () => {
  const now = new Date("2026-09-17T18:00:00.000Z");
  assert.equal(
    shouldSendFamilyCalendarFailureEmail({ hasFailures: false, lastNotifiedAt: null, now }),
    false,
  );
  assert.equal(
    shouldSendFamilyCalendarFailureEmail({ hasFailures: true, lastNotifiedAt: null, now }),
    true,
  );
  assert.equal(
    shouldSendFamilyCalendarFailureEmail({
      hasFailures: true,
      lastNotifiedAt: new Date("2026-09-17T10:00:00.000Z"),
      now,
    }),
    false,
  );
  assert.equal(
    shouldSendFamilyCalendarFailureEmail({
      hasFailures: true,
      lastNotifiedAt: new Date("2026-09-16T17:59:00.000Z"),
      now,
    }),
    true,
  );
});

test("digest recipients with a Google connection are eligible even if the family-dates toggle is off", () => {
  assert.equal(
    isFamilyCalendarSyncEligible({
      hasRefreshToken: true,
      google_calendar_sync_family_dates: false,
      google_calendar_enabled: false,
      hasActiveRenewalDigest: true,
    }),
    true,
  );
  assert.equal(
    isFamilyCalendarSyncEligible({
      hasRefreshToken: true,
      google_calendar_sync_family_dates: false,
      google_calendar_enabled: true,
      hasActiveRenewalDigest: false,
    }),
    true,
  );
  assert.equal(
    isFamilyCalendarSyncEligible({
      hasRefreshToken: false,
      google_calendar_sync_family_dates: true,
      google_calendar_enabled: true,
      hasActiveRenewalDigest: true,
    }),
    false,
  );
  assert.equal(
    isFamilyCalendarSyncEligible({
      hasRefreshToken: true,
      google_calendar_sync_family_dates: false,
      google_calendar_enabled: false,
      hasActiveRenewalDigest: false,
    }),
    false,
  );
});

test("failure email lists failed items and a reconnect link", () => {
  const rendered = renderFamilyCalendarFailureEmail({
    language: "en",
    settingsUrl: "https://example.test/dashboard/upcoming-renewals/email-settings",
    items: [{ summary: "Birthday: Dana", error: "Google Calendar account is not connected" }],
  });
  assert.match(rendered.subject, /Could not add family dates/);
  assert.match(rendered.text, /Birthday: Dana/);
  assert.match(rendered.text, /Reconnect Google Calendar: https:\/\/example.test\/dashboard\/upcoming-renewals\/email-settings/);
  assert.match(rendered.html, /Birthday: Dana/);
});

test("invalid_grant is treated as a single reconnect problem, not per-date failures", () => {
  assert.equal(isGoogleInvalidGrant(new Error("invalid_grant")), true);
  assert.equal(
    isGoogleInvalidGrant({ response: { data: { error: "invalid_grant", error_description: "Token has been expired or revoked." } } }),
    true,
  );
  assert.equal(isGoogleInvalidGrant(new Error("quota exceeded")), false);

  const rendered = renderFamilyCalendarFailureEmail({
    language: "en",
    reason: "invalid_grant",
    settingsUrl: "https://example.test/dashboard/upcoming-renewals/email-settings",
    items: [
      { summary: "Birthday: Dana", error: "invalid_grant" },
      { summary: "Birthday: Talmon Friedlander", error: "invalid_grant" },
    ],
  });
  assert.match(rendered.text, /expired or was revoked/);
  assert.match(rendered.text, /Reconnect Google Calendar/);
  assert.equal(rendered.text.includes("Birthday: Dana"), false);
  assert.equal(rendered.text.includes("Talmon"), false);
});
