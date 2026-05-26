import { HDate } from "@hebcal/hdate";

/** Stored Hebrew month: 1=Nisan … 12=Adar (or Adar I in leap), 13=Adar II (leap only). */
export type HebrewDateComponents = {
  day: number;
  month: number;
  year?: number | null;
};

const MONTH_NAMES_EN: Record<number, string> = {
  1: "Nisan",
  2: "Iyar",
  3: "Sivan",
  4: "Tammuz",
  5: "Av",
  6: "Elul",
  7: "Tishrei",
  8: "Cheshvan",
  9: "Kislev",
  10: "Tevet",
  11: "Shevat",
  12: "Adar",
  13: "Adar II",
};

const MONTH_NAMES_HE: Record<number, string> = {
  1: "ניסן",
  2: "אייר",
  3: "סיוון",
  4: "תמוז",
  5: "אב",
  6: "אלול",
  7: "תשרי",
  8: "חשוון",
  9: "כסלו",
  10: "טבת",
  11: "שבט",
  12: "אדר",
  13: "אדר ב׳",
};

/** Map hebcal HDate month number (1–13) to our stored month. */
export function hebcalMonthToStored(month: number): number {
  return month;
}

export function storedMonthToHebcal(month: number): number {
  return month;
}

/** Treat DB/API DATE values as calendar dates using UTC y-m-d. */
export function calendarDateFromDb(d: Date): Date {
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function dateOnlyLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function gregorianDateToHebrewComponents(d: Date): HebrewDateComponents {
  const local = calendarDateFromDb(d);
  const h = new HDate(local);
  return {
    day: h.getDate(),
    month: hebcalMonthToStored(h.getMonth()),
    year: h.getFullYear(),
  };
}

export function hebrewComponentsToGregorian(
  components: HebrewDateComponents & { year: number },
): Date {
  const hd = new HDate(
    components.day,
    storedMonthToHebcal(components.month),
    components.year,
  );
  return dateOnlyLocal(hd.greg());
}

function tryHebrewToGregorian(day: number, month: number, hebrewYear: number): Date | null {
  try {
    return hebrewComponentsToGregorian({ day, month, year: hebrewYear });
  } catch {
    return null;
  }
}

/**
 * Earliest Gregorian date on or after `fromDate` for a fixed Hebrew month/day
 * (yearly recurrence; uses Hebrew years spanning the window).
 */
export function nextGregorianOccurrenceForHebrewMonthDay(params: {
  month: number;
  day: number;
  fromDate: Date;
}): Date | null {
  const from = dateOnlyLocal(params.fromDate);
  const ref = new HDate(from);
  const hy = ref.getFullYear();

  for (const y of [hy, hy + 1, hy + 2]) {
    const g = tryHebrewToGregorian(params.day, params.month, y);
    if (g && g >= from) return g;
  }
  return null;
}

export function nextAnnualGregorianOccurrence(monthZeroBased: number, day: number, fromDate: Date): Date {
  const from = dateOnlyLocal(fromDate);
  let year = from.getFullYear();
  let candidate = new Date(year, monthZeroBased, day);
  if (candidate < from) {
    year += 1;
    candidate = new Date(year, monthZeroBased, day);
  }
  return dateOnlyLocal(candidate);
}

export function formatHebrewDateLabel(
  components: HebrewDateComponents,
  language: "en" | "he",
): string {
  const names = language === "he" ? MONTH_NAMES_HE : MONTH_NAMES_EN;
  const monthName = names[components.month] ?? String(components.month);
  const day = components.day;
  if (components.year != null) {
    return language === "he"
      ? `${day} ב${monthName} ${components.year}`
      : `${day} ${monthName} ${components.year}`;
  }
  return language === "he" ? `${day} ב${monthName}` : `${day} ${monthName}`;
}

export const HEBREW_MONTH_OPTIONS: { value: number; labelEn: string; labelHe: string }[] = [
  { value: 1, labelEn: "Nisan", labelHe: "ניסן" },
  { value: 2, labelEn: "Iyar", labelHe: "אייר" },
  { value: 3, labelEn: "Sivan", labelHe: "סיוון" },
  { value: 4, labelEn: "Tammuz", labelHe: "תמוז" },
  { value: 5, labelEn: "Av", labelHe: "אב" },
  { value: 6, labelEn: "Elul", labelHe: "אלול" },
  { value: 7, labelEn: "Tishrei", labelHe: "תשרי" },
  { value: 8, labelEn: "Cheshvan", labelHe: "חשוון" },
  { value: 9, labelEn: "Kislev", labelHe: "כסלו" },
  { value: 10, labelEn: "Tevet", labelHe: "טבת" },
  { value: 11, labelEn: "Shevat", labelHe: "שבט" },
  { value: 12, labelEn: "Adar / Adar I", labelHe: "אדר / אדר א׳" },
  { value: 13, labelEn: "Adar II", labelHe: "אדר ב׳" },
];

export function parseHebrewMonthFromForm(raw: string | null | undefined): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 13) return null;
  return n;
}

export function parseHebrewDayFromForm(raw: string | null | undefined): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 30) return null;
  return n;
}

export function parseHebrewYearFromForm(raw: string | null | undefined): number | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

/** Canonical spouse ordering for `family_marriages`. */
export function orderSpouseIds(a: string, b: string): { spouse_a_id: string; spouse_b_id: string } {
  return a < b ? { spouse_a_id: a, spouse_b_id: b } : { spouse_a_id: b, spouse_b_id: a };
}
