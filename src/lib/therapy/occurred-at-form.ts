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

export function defaultOccurredTimeInputValue(d: Date): string {
  if (Number.isNaN(d.getTime()) || isUtcMidnight(d)) return "";
  const parts = getDateTimePartsInIsraelTime(d);
  const hh = String(parts.hour).padStart(2, "0");
  const mm = String(parts.minute).padStart(2, "0");
  return `${hh}:${mm}`;
}
