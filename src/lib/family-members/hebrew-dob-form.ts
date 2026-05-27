import {
  gregorianDateToHebrewComponents,
  parseHebrewDayFromForm,
  parseHebrewMonthFromForm,
  parseHebrewYearFromForm,
} from "@/lib/hebrew-calendar";

export type ParsedHebrewDob = {
  hebrew_date_of_birth_day: number | null;
  hebrew_date_of_birth_month: number | null;
  hebrew_date_of_birth_year: number | null;
};

export function parseHebrewDobFromFormData(formData: FormData): ParsedHebrewDob {
  const day = parseHebrewDayFromForm(formData.get("hebrew_date_of_birth_day") as string | null);
  const month = parseHebrewMonthFromForm(formData.get("hebrew_date_of_birth_month") as string | null);
  const year = parseHebrewYearFromForm(formData.get("hebrew_date_of_birth_year") as string | null);

  if (day == null && month == null && year == null) {
    return {
      hebrew_date_of_birth_day: null,
      hebrew_date_of_birth_month: null,
      hebrew_date_of_birth_year: null,
    };
  }

  if (day == null || month == null) {
    throw new Error("Hebrew birthday requires both day and month");
  }

  return {
    hebrew_date_of_birth_day: day,
    hebrew_date_of_birth_month: month,
    hebrew_date_of_birth_year: year,
  };
}

/** When Hebrew day/month are omitted but Gregorian DOB is set, derive Hebrew components. */
export function resolveHebrewDobForSave(
  hebrewDob: ParsedHebrewDob,
  date_of_birth: Date | null,
): ParsedHebrewDob {
  if (
    date_of_birth &&
    hebrewDob.hebrew_date_of_birth_day == null &&
    hebrewDob.hebrew_date_of_birth_month == null
  ) {
    const h = gregorianDateToHebrewComponents(date_of_birth);
    return {
      hebrew_date_of_birth_day: h.day,
      hebrew_date_of_birth_month: h.month,
      hebrew_date_of_birth_year: h.year ?? null,
    };
  }
  return hebrewDob;
}

export function parseWeddingHebrewFromFormData(formData: FormData, prefix: string): {
  wedding_hebrew_day: number | null;
  wedding_hebrew_month: number | null;
  wedding_hebrew_year: number | null;
} {
  const day = parseHebrewDayFromForm(formData.get(`${prefix}_hebrew_day`) as string | null);
  const month = parseHebrewMonthFromForm(formData.get(`${prefix}_hebrew_month`) as string | null);
  const year = parseHebrewYearFromForm(formData.get(`${prefix}_hebrew_year`) as string | null);

  if (day == null && month == null && year == null) {
    return { wedding_hebrew_day: null, wedding_hebrew_month: null, wedding_hebrew_year: null };
  }
  if (day == null || month == null) {
    throw new Error("Hebrew wedding date requires both day and month");
  }
  return { wedding_hebrew_day: day, wedding_hebrew_month: month, wedding_hebrew_year: year };
}
