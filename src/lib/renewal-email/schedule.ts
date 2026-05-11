import type { RenewalEmailFrequency } from "@/generated/prisma/client";

export type RenewalScheduleFields = {
  frequency: RenewalEmailFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  send_hour: number;
  timezone: string;
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
  const hour = Number(get("hour"));
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

/**
 * True when `now` falls on the subscription's scheduled local calendar day (by frequency)
 * and the user's local clock is at or after their preferred {@link RenewalScheduleFields.send_hour}.
 *
 * Used by Vercel cron: Hobby allows only daily-or-slower schedules, so we stagger several
 * UTC runs per day and treat `send_hour` as "earliest local hour" — the first matching tick
 * after that hour sends the digest; {@link alreadySentOnSameLocalDay} prevents duplicates.
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
      return parts.weekday === dow;
    }
    case "monthly": {
      const dom = sub.day_of_month;
      if (dom == null) return false;
      const dim = daysInMonth(parts.year, parts.month);
      const target = Math.min(dom, dim);
      return parts.day === target;
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
