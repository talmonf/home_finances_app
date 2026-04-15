const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const HM = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Calendar date (yyyy-mm-dd) with optional 24h time, stored as UTC.
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

  let hh = 0;
  let mm = 0;
  const t = (timeStr ?? "").trim();
  if (t) {
    const m = HM.exec(t);
    if (!m) return null;
    hh = Number(m[1]);
    mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      return null;
    }
  }

  const out = new Date(Date.UTC(y, mo - 1, day, hh, mm, 0, 0));
  if (Number.isNaN(out.getTime())) return null;
  return out;
}

export function defaultOccurredTimeInputValue(d: Date): string {
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) {
    return "";
  }
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
