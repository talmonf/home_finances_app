import test from "node:test";
import assert from "node:assert/strict";
import {
  alreadySentOnSameLocalDay,
  shouldSendNow,
  type RenewalScheduleFields,
} from "@/lib/renewal-email/schedule";

function baseSub(overrides: Partial<RenewalScheduleFields> = {}): RenewalScheduleFields {
  return {
    frequency: "daily",
    day_of_week: null,
    day_of_month: null,
    send_hour: 7,
    timezone: "UTC",
    ...overrides,
  };
}

test("shouldSendNow daily matches at or after configured hour", () => {
  const sub = baseSub({ frequency: "daily", send_hour: 7 });
  assert.equal(shouldSendNow(sub, new Date("2026-05-08T07:00:00Z")), true);
  assert.equal(shouldSendNow(sub, new Date("2026-05-08T10:15:00Z")), true);
  assert.equal(shouldSendNow(sub, new Date("2026-05-08T06:00:00Z")), false);
});

test("shouldSendNow weekly checks local weekday and hour", () => {
  const sub = baseSub({
    frequency: "weekly",
    day_of_week: 1,
    send_hour: 10,
  });
  // 2026-05-11 is Monday in UTC.
  assert.equal(shouldSendNow(sub, new Date("2026-05-11T10:30:00Z")), true);
  assert.equal(shouldSendNow(sub, new Date("2026-05-12T10:30:00Z")), false);
});

test("shouldSendNow monthly clamps day_of_month to month end", () => {
  const sub = baseSub({
    frequency: "monthly",
    day_of_month: 31,
    send_hour: 7,
  });
  // April has 30 days.
  assert.equal(shouldSendNow(sub, new Date("2026-04-30T07:00:00Z")), true);
  assert.equal(shouldSendNow(sub, new Date("2026-04-29T07:00:00Z")), false);
});

test("alreadySentOnSameLocalDay blocks duplicate sends in same zone day", () => {
  const tz = "Asia/Jerusalem";
  // Both timestamps fall on the same local calendar day in Jerusalem.
  const sent = new Date("2026-05-10T00:30:00Z");
  const now = new Date("2026-05-10T19:30:00Z");
  assert.equal(alreadySentOnSameLocalDay(sent, now, tz), true);
});
