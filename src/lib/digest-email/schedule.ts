import type { RenewalEmailFrequency } from "@/generated/prisma/client";

export type DigestScheduleFields = {
  frequency: RenewalEmailFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  send_hour: number;
  timezone: string;
  last_sent_at?: Date | null;
  created_at?: Date | null;
};

/** @deprecated Use DigestScheduleFields */
export type RenewalScheduleFields = DigestScheduleFields;

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

function weeklyCatchUpEligible(
  sub: DigestScheduleFields,
  parts: ReturnType<typeof getLocalCalendarParts>,
  now: Date,
  tz: string,
): boolean {
  const dow = sub.day_of_week;
  if (dow == null || parts.weekday <= dow) return false;
  if (sub.last_sent_at != null) return true;
  if (!sub.created_at) return false;
  const scheduledDay = startOfCalendarDayInTimeZone(now, tz);
  scheduledDay.setDate(scheduledDay.getDate() - (parts.weekday - dow));
  return sub.created_at < scheduledDay;
}

function monthlyCatchUpEligible(
  sub: DigestScheduleFields,
  parts: ReturnType<typeof getLocalCalendarParts>,
  targetDay: number,
): boolean {
  if (parts.day <= targetDay) return false;
  if (sub.last_sent_at != null) return true;
  if (!sub.created_at) return false;
  const scheduledDay = new Date(parts.year, parts.month - 1, targetDay);
  return sub.created_at < scheduledDay;
}

function daysInMonth(year: number, month1Based: number): number {
  return new Date(year, month1Based, 0).getDate();
}

export function startOfCalendarDayInTimeZone(utcDate: Date, timeZone: string): Date {
  const { year, month, day } = getLocalCalendarParts(utcDate, timeZone);
  return new Date(year, month - 1, day);
}

export function localWeekKeyInTimeZone(utcDate: Date, timeZone: string): string {
  const parts = getLocalCalendarParts(utcDate, timeZone);
  const anchor = startOfCalendarDayInTimeZone(utcDate, timeZone);
  anchor.setDate(anchor.getDate() - parts.weekday);
  return localDateKeyInTimeZone(anchor, timeZone);
}

export function shouldSendNow(sub: DigestScheduleFields, now: Date): boolean {
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

export function alreadySentOnSameLocalDay(
  lastSentAt: Date | null,
  now: Date,
  timeZone: string,
): boolean {
  if (!lastSentAt) return false;
  return localDateKeyInTimeZone(lastSentAt, timeZone) === localDateKeyInTimeZone(now, timeZone);
}

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
  sub: DigestScheduleFields & { is_active?: boolean },
  now: Date,
): { send: boolean; reason?: ShouldSendSkipReason } {
  if (sub.is_active === false) return { send: false, reason: "inactive" };
  if (alreadySentInDeliveryPeriod(sub.frequency, sub.last_sent_at ?? null, now, sub.timezone)) {
    return { send: false, reason: "already_sent_this_period" };
  }
  if (!shouldSendNow(sub, now)) return { send: false, reason: "not_scheduled" };
  return { send: true };
}

export function debugScheduleEvaluation(
  sub: DigestScheduleFields & { is_active?: boolean },
  now: Date,
) {
  const tz = sub.timezone || "Asia/Jerusalem";
  const parts = getLocalCalendarParts(now, tz);
  const dow = sub.day_of_week;
  const exactWeekdayMatch =
    sub.frequency === "weekly" && dow != null && parts.weekday === dow;
  const weeklyCatchUp =
    sub.frequency === "weekly" ? weeklyCatchUpEligible(sub, parts, now, tz) : false;
  const decision = explainShouldSendNow(sub, now);
  return {
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
}

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

/** End of calendar day `daysAhead` after `start` in household TZ (inclusive window). */
export function endOfDaysAheadWindow(
  start: Date,
  daysAhead: number,
  timeZone: string,
): Date {
  const end = startOfCalendarDayInTimeZone(start, timeZone);
  end.setDate(end.getDate() + Math.max(0, daysAhead));
  end.setHours(23, 59, 59, 999);
  return end;
}
