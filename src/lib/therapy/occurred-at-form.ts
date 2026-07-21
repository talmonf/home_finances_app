import {
  getDateTimePartsInIsraelTime,
  ISRAEL_TIME_ZONE,
  zonedTimeToUtcDate,
} from "@/lib/household-date-format";

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const HM = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

function isUtcMidnight(d: Date): boolean {
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

/**
 * Calendar date (yyyy-mm-dd) with optional 24h time in Israel (Asia/Jerusalem).
 * Date-only rows use UTC midnight so they line up with {@link formatHouseholdDate} / imports.
 */
export function parseTherapyOccurredAtFromForm(
  dateStr: string,
  timeStr: string | null | undefined,
): Date | null {
  const d = dateStr.trim();
  if (!YMD.test(d)) return null;
  const y = Number(d.slice(0, 4));
  const mo = Number(d.slice(5, 7));
  const day = Number(d.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(day)) return null;

  const t = (timeStr ?? "").trim();
  if (!t) {
    const out = new Date(Date.UTC(y, mo - 1, day, 0, 0, 0, 0));
    return Number.isNaN(out.getTime()) ? null : out;
  }

  const m = HM.exec(t);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null;
  }

  return zonedTimeToUtcDate(y, mo, day, hh, mm, 0, ISRAEL_TIME_ZONE);
}

/**
 * Parse `yyyy-mm-dd` or `yyyy-mm-ddTHH:mm` from SplitDateTimeField.
 * Wall-clock times are Israel (Asia/Jerusalem). `T00:00` (optional time left unset)
 * is stored as date-only UTC midnight so list formatting can omit the time.
 */
export function parseTherapyOccurredAtDatetimeLocal(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const [datePart, timePart] = trimmed.split("T");
  if (!datePart) return null;
  const hm = (timePart ?? "").slice(0, 5);
  const timeForParse = !hm || hm === "00:00" ? "" : hm;
  return parseTherapyOccurredAtFromForm(datePart, timeForParse);
}

/** Initial value for SplitDateTimeField: Israel wall clock, or date-only when UTC midnight. */
export function occurredAtToSplitDatetimeInitial(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  if (isUtcMidnight(d)) {
    return d.toISOString().slice(0, 10);
  }
  const parts = getDateTimePartsInIsraelTime(d);
  const y = String(parts.year).padStart(4, "0");
  const mo = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  const hh = String(parts.hour).padStart(2, "0");
  const mm = String(parts.minute).padStart(2, "0");
  return `${y}-${mo}-${day}T${hh}:${mm}`;
}

export function defaultOccurredTimeInputValue(d: Date): string {
  if (Number.isNaN(d.getTime()) || isUtcMidnight(d)) return "";
  const parts = getDateTimePartsInIsraelTime(d);
  const hh = String(parts.hour).padStart(2, "0");
  const mm = String(parts.minute).padStart(2, "0");
  return `${hh}:${mm}`;
}
