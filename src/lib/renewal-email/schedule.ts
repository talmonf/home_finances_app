import type { RenewalEmailFrequency } from "@/generated/prisma/client";

export type RenewalScheduleFields = {
  frequency: RenewalEmailFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  send_hour: number;
  timezone: string;
  /** Used for weekly/monthly catch-up when the scheduled slot was missed earlier in the period. */
  last_sent_at?: Date | null;
  created_at?: Date | null;
};

/** yyyy-MM-dd in the given IANA time zone. */
export function localDateKeyInTimeZone(utcDate: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(utcDate);
}

function normalizeLocalHour(hour: number): number {
  if (!Number.isFinite(hour)) return 0;
  return hour === 24 ? 0 : hour;
}

/** Local calendar year/month/day + hour in `timeZone` (weekday 0 = Sunday … 6 = Saturday). */
export function getLocalCalendarParts(
  utcDate: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; weekday: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "long",
  });
  const parts = dtf.formatToParts(utcDate);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = normalizeLocalHour(Number(get("hour")));
  const wk = get("weekday").trim();
  const weekdayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const weekday = weekdayMap[wk] ?? 0;
  return { year, month, day, hour, weekday };
}

function weeklyCatchUpEligible(sub: RenewalScheduleFields, parts: ReturnType<typeof getLocalCalendarParts>, now: Date, tz: string): boolean {
  const dow = sub.day_of_week;
  if (dow == null || parts.weekday <= dow) return false;
  if (sub.last_sent_at != null) return true;
  if (!sub.created_at) return false;
  const scheduledDay = startOfCalendarDayInTimeZone(now, tz);
  scheduledDay.setDate(scheduledDay.getDate() - (parts.weekday - dow));
  return sub.created_at < scheduledDay;
}

function monthlyCatchUpEligible(sub: RenewalScheduleFields, parts: ReturnType<typeof getLocalCalendarParts>, targetDay: number): boolean {
  if (parts.day <= targetDay) return false;
  if (sub.last_sent_at != null) return true;
  if (!sub.created_at) return false;
  const scheduledDay = new Date(parts.year, parts.month - 1, targetDay);
  return sub.created_at < scheduledDay;
}

function daysInMonth(year: number, month1Based: number): number {
  return new Date(year, month1Based, 0).getDate();
}

/**
 * Start of the user's "today" calendar day in the same sense as {@link startOfToday} on the server:
 * `new Date(y, m - 1, d)` using the calendar date in `timeZone` for instant `utcDate`.
 */
export function startOfCalendarDayInTimeZone(utcDate: Date, timeZone: string): Date {
  const { year, month, day } = getLocalCalendarParts(utcDate, timeZone);
  return new Date(year, month - 1, day);
}

/** Sunday-start week key (yyyy-MM-dd of the week's Sunday) in `timeZone`. */
export function localWeekKeyInTimeZone(utcDate: Date, timeZone: string): string {
  const parts = getLocalCalendarParts(utcDate, timeZone);
  const anchor = startOfCalendarDayInTimeZone(utcDate, timeZone);
  anchor.setDate(anchor.getDate() - parts.weekday);
  return localDateKeyInTimeZone(anchor, timeZone);
}

/**
 * True when `now` falls in the subscription's scheduled send window.
 *
 * Vercel Hobby crons run once per day per job with loose timing, so weekly/monthly digests
 * also catch up later in the same period if an earlier cron tick landed before `send_hour`.
 */
export function shouldSendNow(sub: RenewalScheduleFields, now: Date): boolean {
  const tz = sub.timezone || "Asia/Jerusalem";
  const parts = getLocalCalendarParts(now, tz);
  if (parts.hour < sub.send_hour) return false;

  switch (sub.frequency) {
    case "daily":
      return true;
    case "weekly": {
      const dow = sub.day_of_week;
      if (dow == null) return false;
      if (parts.weekday === dow) return true;
      return weeklyCatchUpEligible(sub, parts, now, tz);
    }
    case "monthly": {
      const dom = sub.day_of_month;
      if (dom == null) return false;
      const dim = daysInMonth(parts.year, parts.month);
      const target = Math.min(dom, dim);
      if (parts.day === target) return true;
      return monthlyCatchUpEligible(sub, parts, target);
    }
    default:
      return false;
  }
}

/** Skip sending twice in the same local calendar day (digest is at most once per day). */
export function alreadySentOnSameLocalDay(
  lastSentAt: Date | null,
  now: Date,
  timeZone: string,
): boolean {
  if (!lastSentAt) return false;
  return localDateKeyInTimeZone(lastSentAt, timeZone) === localDateKeyInTimeZone(now, timeZone);
}

/** Skip sending twice in the same delivery period (day / Sun-start week / calendar month). */
export function alreadySentInDeliveryPeriod(
  frequency: RenewalEmailFrequency,
  lastSentAt: Date | null,
  now: Date,
  timeZone: string,
): boolean {
  if (!lastSentAt) return false;
  const tz = timeZone || "Asia/Jerusalem";
  switch (frequency) {
    case "daily":
      return alreadySentOnSameLocalDay(lastSentAt, now, tz);
    case "weekly":
      return localWeekKeyInTimeZone(lastSentAt, tz) === localWeekKeyInTimeZone(now, tz);
    case "monthly": {
      const last = getLocalCalendarParts(lastSentAt, tz);
      const current = getLocalCalendarParts(now, tz);
      return last.year === current.year && last.month === current.month;
    }
    default:
      return false;
  }
}

export type ShouldSendSkipReason =
  | "not_scheduled"
  | "already_sent_this_period"
  | "inactive";

export function explainShouldSendNow(
  sub: RenewalScheduleFields & { is_active?: boolean },
  now: Date,
): { send: boolean; reason?: ShouldSendSkipReason } {
  if (sub.is_active === false) return { send: false, reason: "inactive" };
  if (alreadySentInDeliveryPeriod(sub.frequency, sub.last_sent_at ?? null, now, sub.timezone)) {
    return { send: false, reason: "already_sent_this_period" };
  }
  if (!shouldSendNow(sub, now)) return { send: false, reason: "not_scheduled" };
  return { send: true };
}

/** Runtime diagnostics for cron / email-settings debugging (no PII). */
export function debugScheduleEvaluation(
  sub: RenewalScheduleFields & { is_active?: boolean },
  now: Date,
): {
  nowUtc: string;
  timezone: string;
  local: ReturnType<typeof getLocalCalendarParts>;
  sendHour: number;
  frequency: string;
  dayOfWeek: number | null;
  hourAtOrAfterSendHour: boolean;
  exactWeekdayMatch: boolean;
  weeklyCatchUp: boolean;
  alreadySentThisPeriod: boolean;
  decision: ReturnType<typeof explainShouldSendNow>;
} {
  const tz = sub.timezone || "Asia/Jerusalem";
  const parts = getLocalCalendarParts(now, tz);
  const dow = sub.day_of_week;
  const exactWeekdayMatch =
    sub.frequency === "weekly" && dow != null && parts.weekday === dow;
  const weeklyCatchUp =
    sub.frequency === "weekly" ? weeklyCatchUpEligible(sub, parts, now, tz) : false;
  const decision = explainShouldSendNow(sub, now);
  const result = {
    nowUtc: now.toISOString(),
    timezone: tz,
    local: parts,
    sendHour: sub.send_hour,
    frequency: sub.frequency,
    dayOfWeek: dow,
    hourAtOrAfterSendHour: parts.hour >= sub.send_hour,
    exactWeekdayMatch,
    weeklyCatchUp,
    alreadySentThisPeriod: alreadySentInDeliveryPeriod(
      sub.frequency,
      sub.last_sent_at ?? null,
      now,
      tz,
    ),
    decision,
  };
  // #region agent log
  fetch("http://127.0.0.1:7621/ingest/adff46cd-7c3b-47a7-be95-a9a2c6036576", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fadee9" },
    body: JSON.stringify({
      sessionId: "fadee9",
      hypothesisId: "B",
      location: "schedule.ts:debugScheduleEvaluation",
      message: "schedule evaluation",
      data: result,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return result;
}

/** When each vercel.json UTC cron tick qualifies for send_hour in `timeZone` on the anchor date. */
export function cronUtcSlotsQualification(
  sendHour: number,
  timeZone: string,
  dayOfWeek: number,
  anchorUtc: Date,
) {
  const utcHours = [5, 11, 17, 23];
  const y = anchorUtc.getUTCFullYear();
  const m = anchorUtc.getUTCMonth();
  const d = anchorUtc.getUTCDate();
  return utcHours.map((utcH) => {
    const instant = new Date(Date.UTC(y, m, d, utcH, 0, 0));
    const parts = getLocalCalendarParts(instant, timeZone);
    return {
      utcCron: `0 ${utcH} * * *`,
      localHour: parts.hour,
      localWeekday: parts.weekday,
      localWeekdayName: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][parts.weekday],
      hourAtOrAfterSendHour: parts.hour >= sendHour,
      exactWeekdayMatch: parts.weekday === dayOfWeek,
      qualifies:
        parts.hour >= sendHour &&
        (parts.weekday === dayOfWeek || parts.weekday > dayOfWeek),
    };
  });
}
