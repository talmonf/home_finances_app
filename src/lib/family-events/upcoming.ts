import { prisma } from "@/lib/auth";
import {
  calendarDateFromDb,
  formatHebrewDateLabel,
  nextAnnualGregorianOccurrence,
  nextGregorianOccurrenceForHebrewMonthDay,
} from "@/lib/hebrew-calendar";
import type { RenewalRow } from "@/lib/upcoming-renewals/compute";

type FamilyMemberRow = {
  id: string;
  full_name: string;
  date_of_birth: Date | null;
  hebrew_date_of_birth_day: number | null;
  hebrew_date_of_birth_month: number | null;
  hebrew_date_of_birth_year: number | null;
};

type MarriageRow = {
  id: string;
  wedding_date: Date | null;
  wedding_hebrew_day: number | null;
  wedding_hebrew_month: number | null;
  wedding_hebrew_year: number | null;
  spouse_a: { id: string; full_name: string };
  spouse_b: { id: string; full_name: string };
};

function formatDateDDMMYYYY(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

function formatFridayNightSaturdayLabel(language: "en" | "he", hebrewOccurrenceDate: Date) {
  const eve = addDays(hebrewOccurrenceDate, -1);
  const day = hebrewOccurrenceDate;
  const eveLabel = formatDateDDMMYYYY(eve);
  const dayLabel = formatDateDDMMYYYY(day);
  if (language === "he") {
    return `ליל שישי-שבת ${eveLabel}-${dayLabel}`;
  }
  return `Fri night-Sat ${eveLabel}-${dayLabel}`;
}

function joinDateDetails(
  language: "en" | "he",
  details: { gregorianDate?: Date | null; hebrewDate?: { label: string; occurrenceDate: Date } },
) {
  const parts: string[] = [];
  if (details.gregorianDate) {
    const d = formatDateDDMMYYYY(details.gregorianDate);
    parts.push(language === "he" ? `לועזי: ${d}` : `Gregorian: ${d}`);
  }
  if (details.hebrewDate) {
    const hebrewPart =
      language === "he"
        ? `עברי: ${details.hebrewDate.label} (${formatFridayNightSaturdayLabel(language, details.hebrewDate.occurrenceDate)})`
        : `Hebrew: ${details.hebrewDate.label} (${formatFridayNightSaturdayLabel(language, details.hebrewDate.occurrenceDate)})`;
    parts.push(hebrewPart);
  }
  return parts.join(language === "he" ? " | " : " | ");
}

function choosePrimaryDate(dates: Date[]): Date {
  return [...dates].sort((a, b) => a.getTime() - b.getTime())[0];
}

function birthdayRowsForMember(
  member: FamilyMemberRow,
  today: Date,
  language: "en" | "he",
): RenewalRow[] {
  const he = language === "he";
  let nextHebrew: Date | null = null;
  let hebrewLabel: string | null = null;
  let nextGregorian: Date | null = null;

  if (member.hebrew_date_of_birth_month != null && member.hebrew_date_of_birth_day != null) {
    nextHebrew = nextGregorianOccurrenceForHebrewMonthDay({
      month: member.hebrew_date_of_birth_month,
      day: member.hebrew_date_of_birth_day,
      fromDate: today,
    });
    hebrewLabel = formatHebrewDateLabel(
      {
        day: member.hebrew_date_of_birth_day,
        month: member.hebrew_date_of_birth_month,
        year: member.hebrew_date_of_birth_year,
      },
      language,
    );
  }

  if (member.date_of_birth) {
    const dob = calendarDateFromDb(member.date_of_birth);
    nextGregorian = nextAnnualGregorianOccurrence(
      dob.getMonth(),
      dob.getDate(),
      today,
    );
  }

  const candidateDates = [nextGregorian, nextHebrew].filter((d): d is Date => Boolean(d));
  if (candidateDates.length === 0) return [];
  const renewalDate = choosePrimaryDate(candidateDates);
  const details = joinDateDetails(language, {
    gregorianDate: nextGregorian,
    hebrewDate: nextHebrew && hebrewLabel ? { label: hebrewLabel, occurrenceDate: nextHebrew } : undefined,
  });

  return [
    {
      id: `birthday-${member.id}`,
      category: "Birthday",
      itemName: member.full_name,
      owner: he ? "משק הבית" : "Household",
      ownerId: member.id,
      renewalDate,
      renewalType: he ? `יום הולדת · ${details}` : `Birthday · ${details}`,
      href: `/dashboard/family-members/${member.id}`,
    },
  ];
}

function anniversaryRowsForMarriage(
  marriage: MarriageRow,
  today: Date,
  language: "en" | "he",
): RenewalRow[] {
  const he = language === "he";
  const names = `${marriage.spouse_a.full_name} & ${marriage.spouse_b.full_name}`;
  let nextHebrew: Date | null = null;
  let hebrewLabel: string | null = null;
  let nextGregorian: Date | null = null;

  if (marriage.wedding_hebrew_month != null && marriage.wedding_hebrew_day != null) {
    nextHebrew = nextGregorianOccurrenceForHebrewMonthDay({
      month: marriage.wedding_hebrew_month,
      day: marriage.wedding_hebrew_day,
      fromDate: today,
    });
    hebrewLabel = formatHebrewDateLabel(
      {
        day: marriage.wedding_hebrew_day,
        month: marriage.wedding_hebrew_month,
        year: marriage.wedding_hebrew_year,
      },
      language,
    );
  }

  if (marriage.wedding_date) {
    const wd = calendarDateFromDb(marriage.wedding_date);
    nextGregorian = nextAnnualGregorianOccurrence(wd.getMonth(), wd.getDate(), today);
  }

  const candidateDates = [nextGregorian, nextHebrew].filter((d): d is Date => Boolean(d));
  if (candidateDates.length === 0) return [];
  const renewalDate = choosePrimaryDate(candidateDates);
  const details = joinDateDetails(language, {
    gregorianDate: nextGregorian,
    hebrewDate: nextHebrew && hebrewLabel ? { label: hebrewLabel, occurrenceDate: nextHebrew } : undefined,
  });

  return [
    {
      id: `anniversary-${marriage.id}`,
      category: "Anniversary",
      itemName: names,
      owner: he ? "משק הבית" : "Household",
      ownerId: null,
      renewalDate,
      renewalType: he ? `יום נישואין · ${details}` : `Anniversary · ${details}`,
      href: "/dashboard/family-members/marriages",
    },
  ];
}

export async function loadUpcomingFamilyEventRows(params: {
  householdId: string;
  today: Date;
  language: "en" | "he";
}): Promise<RenewalRow[]> {
  const { householdId, today, language } = params;

  const [members, marriages] = await Promise.all([
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      select: {
        id: true,
        full_name: true,
        date_of_birth: true,
        hebrew_date_of_birth_day: true,
        hebrew_date_of_birth_month: true,
        hebrew_date_of_birth_year: true,
      },
    }),
    prisma.family_marriages.findMany({
      where: { household_id: householdId },
      include: {
        spouse_a: { select: { id: true, full_name: true } },
        spouse_b: { select: { id: true, full_name: true } },
      },
    }),
  ]);

  const rows: RenewalRow[] = [];
  for (const m of members) {
    rows.push(...birthdayRowsForMember(m, today, language));
  }
  for (const marriage of marriages) {
    rows.push(...anniversaryRowsForMarriage(marriage, today, language));
  }
  return rows;
}
