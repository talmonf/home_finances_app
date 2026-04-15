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
  if (!d) return "—";
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

/** Date + time (UTC), e.g. for clinic timestamps previously shown as ISO slice. */
export function formatHouseholdDateUtcWithTime(
  d: Date | null | undefined,
  format: HouseholdDateDisplayFormat,
): string {
  if (!d) return "—";
  const datePart = formatHouseholdDate(d, format);
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  return `${datePart} ${hh}:${mm}`;
}

/** Like {@link formatHouseholdDateUtcWithTime} but omits time when the instant is UTC midnight (date-only). */
export function formatHouseholdDateUtcWithOptionalTime(
  d: Date | null | undefined,
  format: HouseholdDateDisplayFormat,
): string {
  if (!d) return "—";
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

export const HOUSEHOLD_DATE_FORMAT_LABELS: Record<HouseholdDateDisplayFormat, string> = {
  YMD: "yyyy-MM-dd (ISO)",
  DMY: "dd/MM/yyyy",
  MDY: "MM/dd/yyyy",
};
