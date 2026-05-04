import type { HouseholdDateDisplayFormat } from "@/generated/prisma/client";
import { formatYmdParts } from "@/lib/household-date-format";

const ISRAEL_TZ = "Asia/Jerusalem";

/** Two-digit years 00–69 → 2000–2069; 70–99 → 1970–1999 (so "25" → 2025). */
export function expandTwoDigitYear(yy: number): number {
  if (yy < 0 || yy > 99) return yy;
  return yy <= 69 ? 2000 + yy : 1900 + yy;
}

export function getCalendarTodayPartsIsrael(): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return { y: get("year"), m: get("month"), d: get("day") };
}

function compareYmd(
  a: { y: number; m: number; d: number },
  b: { y: number; m: number; d: number },
): number {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
}

function isValidCalendarYmd(y: number, m: number, d: number): boolean {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function utcMidnightForYmd(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

/** Display string for the fill date field from stored `yyyy-mm-dd`. */
export function formatFilledAtForForm(
  isoYmd: string | null | undefined,
  format: HouseholdDateDisplayFormat,
): string {
  if (!isoYmd?.trim()) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim());
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!isValidCalendarYmd(y, mo, d)) return "";
  return formatYmdParts(y, mo, d, format);
}

export type ParseFilledAtResult =
  | { ok: true; utcDate: Date; isoYmd: string }
  | { ok: false; message: string };

function parseIsoYmdFirst(raw: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!isValidCalendarYmd(y, mo, d)) return null;
  return { y, m: mo, d };
}

function normalizeYearPart(s: string): number | null {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return null;
  if (t.length === 2) return expandTwoDigitYear(Number(t));
  if (t.length === 4) {
    const y = Number(t);
    return Number.isFinite(y) ? y : null;
  }
  return null;
}

function normalizeMdPart(s: string): number | null {
  const t = s.trim();
  if (!/^\d{1,2}$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse fill date from form text. Accepts `yyyy-mm-dd` always, or tokens in household order
 * with `/` or `-` separators. No future dates (calendar comparison in Asia/Jerusalem).
 */
export function parseFilledAtFromForm(
  raw: string | null | undefined,
  format: HouseholdDateDisplayFormat,
): ParseFilledAtResult {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) {
    return { ok: false, message: "Enter a fill date." };
  }

  const isoTry = parseIsoYmdFirst(trimmed);
  if (isoTry) {
    const today = getCalendarTodayPartsIsrael();
    if (compareYmd(isoTry, today) > 0) {
      return { ok: false, message: "Fill date cannot be in the future." };
    }
    const utcDate = utcMidnightForYmd(isoTry.y, isoTry.m, isoTry.d);
    const isoYmd = `${isoTry.y}-${String(isoTry.m).padStart(2, "0")}-${String(isoTry.d).padStart(2, "0")}`;
    return { ok: true, utcDate, isoYmd };
  }

  let y: number;
  let month: number;
  let day: number;

  if (format === "DMY") {
    const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/.exec(trimmed);
    if (!m) {
      return { ok: false, message: "Use the date format from your settings (e.g. dd/mm/yyyy)." };
    }
    const d1 = normalizeMdPart(m[1]);
    const d2 = normalizeMdPart(m[2]);
    const yr = normalizeYearPart(m[3]);
    if (d1 == null || d2 == null || yr == null) {
      return { ok: false, message: "Invalid date." };
    }
    day = d1;
    month = d2;
    y = yr;
  } else if (format === "MDY") {
    const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/.exec(trimmed);
    if (!m) {
      return { ok: false, message: "Use the date format from your settings (e.g. mm/dd/yyyy)." };
    }
    const d1 = normalizeMdPart(m[1]);
    const d2 = normalizeMdPart(m[2]);
    const yr = normalizeYearPart(m[3]);
    if (d1 == null || d2 == null || yr == null) {
      return { ok: false, message: "Invalid date." };
    }
    month = d1;
    day = d2;
    y = yr;
  } else {
    const m = /^(\d{2}|\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/.exec(trimmed);
    if (!m) {
      return { ok: false, message: "Use the date format from your settings (e.g. yyyy-mm-dd)." };
    }
    const yr = normalizeYearPart(m[1]);
    const mo = normalizeMdPart(m[2]);
    const da = normalizeMdPart(m[3]);
    if (da == null || mo == null || yr == null) {
      return { ok: false, message: "Invalid date." };
    }
    y = yr;
    month = mo;
    day = da;
  }

  if (!isValidCalendarYmd(y, month, day)) {
    return { ok: false, message: "That calendar date is not valid." };
  }

  const today = getCalendarTodayPartsIsrael();
  const parsed = { y, m: month, d: day };
  if (compareYmd(parsed, today) > 0) {
    return { ok: false, message: "Fill date cannot be in the future." };
  }

  const utcDate = utcMidnightForYmd(y, month, day);
  const isoYmd = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { ok: true, utcDate, isoYmd };
}

/** Server-side: parse `filled_at` field (ISO or household-formatted string). */
export function parseFilledAtFieldForServer(
  raw: string | null | undefined,
  format: HouseholdDateDisplayFormat,
): Date | null {
  const r = parseFilledAtFromForm(raw, format);
  return r.ok ? r.utcDate : null;
}
