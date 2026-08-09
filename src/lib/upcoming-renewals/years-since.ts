import { gregorianDateToHebrewComponents } from "@/lib/hebrew-calendar";

/** Calendar-year difference for a Gregorian anniversary occurrence. */
export function yearsSinceGregorian(original: Date, occurrence: Date): number {
  return occurrence.getFullYear() - original.getFullYear();
}

/** Hebrew-year difference when the original Hebrew year is known. */
export function yearsSinceHebrew(
  originalHebrewYear: number,
  occurrenceGregorian: Date,
): number | null {
  const year = gregorianDateToHebrewComponents(occurrenceGregorian).year;
  if (year == null) return null;
  return year - originalHebrewYear;
}

export function formatYearsSinceLabel(years: number, language: "en" | "he"): string {
  if (language === "he") {
    return years === 1 ? "שנה אחת" : `${years} שנים`;
  }
  return years === 1 ? "1 year" : `${years} years`;
}
