import type { AmountTotalsByCurrency } from "@/lib/private-clinic/list-amount-totals";
import type { UiLanguage } from "@/lib/ui-language";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatUtcYmd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Parse yyyy-mm-dd to UTC midnight. */
export function parseDashboardYmd(raw: string | undefined | null): Date | null {
  if (!raw?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  const d = new Date(Date.UTC(y, mo - 1, da));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== da) return null;
  return d;
}

export function utcMonthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

export function utcMonthStart(key: string): Date {
  const [ys, ms] = key.split("-");
  return new Date(Date.UTC(Number(ys), Number(ms) - 1, 1));
}

export function utcMonthEndInclusive(key: string): Date {
  const start = utcMonthStart(key);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
}

export function formatDashboardMonthLabel(key: string, lang: UiLanguage): string {
  const start = utcMonthStart(key);
  return new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(start);
}

/** First of the month 11 months ago through exclusive start of next month (UTC). */
export function defaultLast12MonthRange(now: Date = new Date()): {
  fromYmd: string;
  toYmd: string;
  rangeStart: Date;
  rangeEndExclusive: Date;
} {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const rangeStart = new Date(Date.UTC(y, m - 11, 1));
  const rangeEndExclusive = new Date(Date.UTC(y, m + 1, 1));
  const lastDay = new Date(Date.UTC(y, m + 1, 0));
  return {
    fromYmd: formatUtcYmd(rangeStart),
    toYmd: formatUtcYmd(lastDay),
    rangeStart,
    rangeEndExclusive,
  };
}

export function resolveDashboardDateRange(
  fromRaw: string,
  toRaw: string,
  now: Date = new Date(),
): { fromYmd: string; toYmd: string; rangeStart: Date; rangeEndExclusive: Date } {
  const fallback = defaultLast12MonthRange(now);
  let from = parseDashboardYmd(fromRaw);
  let toInclusive = parseDashboardYmd(toRaw);

  if (!from && !toInclusive) return fallback;

  if (!from) from = fallback.rangeStart;
  if (!toInclusive) {
    toInclusive = new Date(fallback.rangeEndExclusive.getTime() - 24 * 60 * 60 * 1000);
  }

  if (from > toInclusive) {
    const swap = from;
    from = toInclusive;
    toInclusive = swap;
  }

  const rangeEndExclusive = new Date(
    Date.UTC(toInclusive.getUTCFullYear(), toInclusive.getUTCMonth(), toInclusive.getUTCDate() + 1),
  );
  return {
    fromYmd: formatUtcYmd(from),
    toYmd: formatUtcYmd(toInclusive),
    rangeStart: from,
    rangeEndExclusive,
  };
}

export function utcMonthKeys(rangeStart: Date, rangeEndExclusive: Date): string[] {
  const keys: string[] = [];
  let y = rangeStart.getUTCFullYear();
  let m = rangeStart.getUTCMonth();
  const endY = rangeEndExclusive.getUTCFullYear();
  const endM = rangeEndExclusive.getUTCMonth();
  while (y < endY || (y === endY && m < endM)) {
    keys.push(`${y}-${pad2(m + 1)}`);
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  return keys;
}

export function clientOverlapsMonth(
  startDate: Date | null,
  endDate: Date | null,
  monthKey: string,
): boolean {
  const monthStart = utcMonthStart(monthKey);
  const monthEnd = utcMonthEndInclusive(monthKey);
  if (startDate && startDate > monthEnd) return false;
  if (endDate && endDate < monthStart) return false;
  return true;
}

const UTC_DAY_MS = 24 * 60 * 60 * 1000;

export type HoldPeriodRange = {
  started_on: Date;
  ended_on: Date | null;
};

export function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Israel calendar date as UTC midnight (matches clinic DATE fields). */
export function clinicCalendarTodayUtc(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parseDashboardYmd(ymd) ?? utcDateOnly(now);
}

function holdHalfOpenInterval(period: HoldPeriodRange): { start: number; end: number } {
  const start = utcDateOnly(period.started_on).getTime();
  const end =
    period.ended_on == null ? Number.POSITIVE_INFINITY : utcDateOnly(period.ended_on).getTime();
  return { start, end };
}

/**
 * Hold covers [started_on, ended_on): `ended_on` is the return-to-service day (in care that day).
 * A null `ended_on` means still on hold.
 */
export function dayIsCoveredByHold(day: Date, holds: HoldPeriodRange[]): boolean {
  const t = utcDateOnly(day).getTime();
  return holds.some((h) => {
    const { start, end } = holdHalfOpenInterval(h);
    return t >= start && t < end;
  });
}

export function holdPeriodRangesOverlap(a: HoldPeriodRange, b: HoldPeriodRange): boolean {
  const A = holdHalfOpenInterval(a);
  const B = holdHalfOpenInterval(b);
  return A.start < B.end && B.start < A.end;
}

/** True if any calendar day in the month is in the care span and not covered by a hold. */
export function clientHasNonHoldServiceDayInMonth(
  startDate: Date | null,
  endDate: Date | null,
  holds: HoldPeriodRange[],
  monthKey: string,
): boolean {
  if (!clientOverlapsMonth(startDate, endDate, monthKey)) return false;
  const monthStart = utcMonthStart(monthKey);
  const monthEnd = utcMonthEndInclusive(monthKey);
  const careStartMs = startDate
    ? Math.max(utcDateOnly(startDate).getTime(), monthStart.getTime())
    : monthStart.getTime();
  const careEndMs = endDate
    ? Math.min(utcDateOnly(endDate).getTime(), monthEnd.getTime())
    : monthEnd.getTime();
  for (let t = careStartMs; t <= careEndMs; t += UTC_DAY_MS) {
    if (!dayIsCoveredByHold(new Date(t), holds)) return true;
  }
  return false;
}

export function pickChartCurrency(totals: AmountTotalsByCurrency): string | null {
  const nonzero = totals.filter((t) => t.total !== 0);
  const pool = nonzero.length > 0 ? nonzero : totals;
  if (pool.length === 0) return null;
  if (pool.some((t) => t.currency === "ILS")) return "ILS";
  return [...pool].sort((a, b) => Math.abs(b.total) - Math.abs(a.total))[0]!.currency;
}

function parseSearchParamList(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  const raw = Array.isArray(value) ? value : [value];
  return [...new Set(raw.map((v) => v.trim()).filter(Boolean))];
}

export function parseDashboardProgramsFilter(raw: string | string[] | undefined): string[] {
  return parseSearchParamList(raw);
}

/** Inclusive UTC calendar days from first to last (same day = 1). */
export function inclusiveUtcDaySpan(first: Date, last: Date): number {
  const a = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate());
  const b = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return Math.round((max - min) / (24 * 60 * 60 * 1000)) + 1;
}
