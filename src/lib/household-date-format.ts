import type { HouseholdDateDisplayFormat as PrismaHouseholdDateFormat } from "@/generated/prisma/client";

export type HouseholdDateDisplayFormat = PrismaHouseholdDateFormat;

export const DEFAULT_HOUSEHOLD_DATE_DISPLAY_FORMAT: HouseholdDateDisplayFormat = "YMD";

export function normalizeHouseholdDateDisplayFormat(
  v: string | HouseholdDateDisplayFormat | null | undefined,
): HouseholdDateDisplayFormat {
  if (v === "DMY" || v === "MDY" || v === "YMD") return v;
  return DEFAULT_HOUSEHOLD_DATE_DISPLAY_FORMAT;
}

/** Browsers use this for native `<input type="date">` presentation hints. */
export function htmlLangForDateDisplayFormat(f: HouseholdDateDisplayFormat): string {
  switch (f) {
    case "DMY":
      return "en-GB";
    case "MDY":
      return "en-US";
    case "YMD":
    default:
      return "en-CA";
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const ISRAEL_TIME_ZONE = "Asia/Jerusalem";

function getDateTimePartsInIsraelTime(d: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

export function formatYmdParts(
  year: number,
  month: number,
  day: number,
  format: HouseholdDateDisplayFormat,
): string {
  const y = year;
  const m = pad2(month);
  const d = pad2(day);
  switch (format) {
    case "DMY":
      return `${d}/${m}/${y}`;
    case "MDY":
      return `${m}/${d}/${y}`;
    case "YMD":
    default:
      return `${y}-${m}-${d}`;
  }
}

/** Calendar date in UTC (matches typical DB DATE / midnight UTC timestamps). */
export function formatHouseholdDate(
  d: Date | null | undefined,
  format: HouseholdDateDisplayFormat,
): string {
  if (!d || Number.isNaN(d.getTime())) return "—";
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return formatYmdParts(y, m, day, format);
}

/** Parse yyyy-mm-dd string without timezone shifts; format for display. */
export function formatIsoDateStringForHousehold(
  isoYmd: string | null | undefined,
  format: HouseholdDateDisplayFormat,
): string {
  if (!isoYmd?.trim()) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim());
  if (!m) return isoYmd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return isoYmd;
  return formatYmdParts(y, mo, d, format);
}

/** Date + time rendered in Israel timezone (Asia/Jerusalem). */
export function formatHouseholdDateUtcWithTime(
  d: Date | null | undefined,
  format: HouseholdDateDisplayFormat,
): string {
  if (!d || Number.isNaN(d.getTime())) return "—";
  const parts = getDateTimePartsInIsraelTime(d);
  const datePart = formatYmdParts(parts.year, parts.month, parts.day, format);
  const hh = pad2(parts.hour);
  const mm = pad2(parts.minute);
  return `${datePart} ${hh}:${mm}`;
}

/** Like {@link formatHouseholdDateUtcWithTime} but omits time when the instant is UTC midnight (date-only). */
export function formatHouseholdDateUtcWithOptionalTime(
  d: Date | null | undefined,
  format: HouseholdDateDisplayFormat,
): string {
  if (!d || Number.isNaN(d.getTime())) return "—";
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    return formatHouseholdDate(d, format);
  }
  return formatHouseholdDateUtcWithTime(d, format);
}

/** `yyyy-mm-dd` for `<input type="date">` (UTC calendar day); empty if missing or invalid. */
export function utcDateToHtmlDateInputValue(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Israel date+time for `<input type="datetime-local">`; empty if invalid. */
export function dateToDatetimeLocalValue(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  const parts = getDateTimePartsInIsraelTime(d);
  const datePart = formatYmdParts(parts.year, parts.month, parts.day, "YMD");
  return `${datePart}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export const HOUSEHOLD_DATE_FORMAT_LABELS: Record<HouseholdDateDisplayFormat, string> = {
  YMD: "yyyy-MM-dd (ISO)",
  DMY: "dd/MM/yyyy",
  MDY: "MM/dd/yyyy",
};

function isValidCalendarDateYmd(year: number, month: number, day: number): boolean {
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day;
}

/** Placeholder hint for a text date field (native `type="date"` ignores household order on many platforms). */
export function householdDateInputPlaceholder(format: HouseholdDateDisplayFormat): string {
  switch (format) {
    case "DMY":
      return "dd/mm/yyyy";
    case "MDY":
      return "mm/dd/yyyy";
    case "YMD":
    default:
      return "yyyy-mm-dd";
  }
}

/** `yyyy-mm-dd` calendar day → display string for the household order (empty if invalid). */
export function isoYmdToHouseholdInputDisplay(
  isoYmd: string | null | undefined,
  format: HouseholdDateDisplayFormat,
): string {
  if (!isoYmd?.trim()) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim());
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!isValidCalendarDateYmd(y, mo, d)) return "";
  return formatYmdParts(y, mo, d, format);
}

/**
 * Parse a user-typed date in the household segment order into `yyyy-mm-dd`.
 * Also accepts pasted ISO `yyyy-mm-dd`. Returns null if empty/invalid/incomplete.
 */
export function parseHouseholdDateInputToIsoYmd(
  raw: string,
  format: HouseholdDateDisplayFormat,
): string | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const y = Number(iso[1]);
    const mo = Number(iso[2]);
    const d = Number(iso[3]);
    if (!isValidCalendarDateYmd(y, mo, d)) return null;
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const parts = s.split(/[/.\s]+/).filter((p) => p.length > 0);
  if (parts.length !== 3) return null;
  const nums = parts.map((p) => Number.parseInt(p, 10));
  if (nums.some((n) => Number.isNaN(n))) return null;

  let y: number;
  let mo: number;
  let d: number;

  if (format === "YMD") {
    if (parts[0].length !== 4) return null;
    y = nums[0];
    mo = nums[1];
    d = nums[2];
  } else if (format === "DMY") {
    d = nums[0];
    mo = nums[1];
    y = nums[2];
    if (parts[2].length <= 2) y = y < 50 ? 2000 + y : 1900 + y;
  } else {
    mo = nums[0];
    d = nums[1];
    y = nums[2];
    if (parts[2].length <= 2) y = y < 50 ? 2000 + y : 1900 + y;
  }

  if (!isValidCalendarDateYmd(y, mo, d)) return null;
  return `${String(y).padStart(4, "0")}-${pad2(mo)}-${pad2(d)}`;
}
