import { prisma } from "@/lib/auth";
import {
  calendarDateFromDb,
  formatHebrewDateLabel,
  gregorianDateToHebrewComponents,
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

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

function formatFridayNightSaturdayLabel(language: "en" | "he", hebrewOccurrenceDate: Date) {
  const eve = addDays(hebrewOccurrenceDate, -1);
  const day = hebrewOccurrenceDate;
  const eveDd = String(eve.getDate()).padStart(2, "0");
  const eveMm = String(eve.getMonth() + 1).padStart(2, "0");
  const eveYyyy = eve.getFullYear();
  const dayDd = String(day.getDate()).padStart(2, "0");
  const dayMm = String(day.getMonth() + 1).padStart(2, "0");
  const dayYyyy = day.getFullYear();
  const eveLabel = `${eveDd}/${eveMm}/${eveYyyy}`;
  const dayLabel = `${dayDd}/${dayMm}/${dayYyyy}`;
  if (language === "he") {
    return `ליל שישי-שבת ${eveLabel}-${dayLabel}`;
  }
  return `Fri night-Sat ${eveLabel}-${dayLabel}`;
}

function hebrewOccurrenceRenewalType(
  language: "en" | "he",
  month: number,
  day: number,
  occurrenceDate: Date,
): string {
  const h = gregorianDateToHebrewComponents(occurrenceDate);
  const label = formatHebrewDateLabel(
    { day, month, year: h.year },
    language,
  );
  const timing = formatFridayNightSaturdayLabel(language, occurrenceDate);
  return language === "he" ? `עברי: ${label} (${timing})` : `Hebrew: ${label} (${timing})`;
}

function birthdayRowsForMember(
  member: FamilyMemberRow,
  today: Date,
  language: "en" | "he",
): RenewalRow[] {
  const he = language === "he";
  const rows: RenewalRow[] = [];
  const href = `/dashboard/family-members/${member.id}`;

  if (member.date_of_birth) {
    const dob = calendarDateFromDb(member.date_of_birth);
    const nextGregorian = nextAnnualGregorianOccurrence(
      dob.getMonth(),
      dob.getDate(),
      today,
    );
    rows.push({
      id: `birthday-gregorian-${member.id}`,
      category: "Birthday",
      itemName: member.full_name,
      owner: member.full_name,
      ownerId: member.id,
      renewalDate: nextGregorian,
      renewalType: he ? "יום הולדת" : "Birthday",
      href,
    });
  }

  if (member.hebrew_date_of_birth_month != null && member.hebrew_date_of_birth_day != null) {
    const nextHebrew = nextGregorianOccurrenceForHebrewMonthDay({
      month: member.hebrew_date_of_birth_month,
      day: member.hebrew_date_of_birth_day,
      fromDate: today,
    });
    if (nextHebrew) {
      rows.push({
        id: `birthday-hebrew-${member.id}`,
        category: "Birthday",
        itemName: member.full_name,
        owner: member.full_name,
        ownerId: member.id,
        renewalDate: nextHebrew,
        renewalType: hebrewOccurrenceRenewalType(
          language,
          member.hebrew_date_of_birth_month,
          member.hebrew_date_of_birth_day,
          nextHebrew,
        ),
        href,
      });
    }
  }

  return rows;
}

function anniversaryRowsForMarriage(
  marriage: MarriageRow,
  today: Date,
  language: "en" | "he",
): RenewalRow[] {
  const he = language === "he";
  const names = `${marriage.spouse_a.full_name} & ${marriage.spouse_b.full_name}`;
  const owner = he ? "משק הבית" : "Household";
  const href = "/dashboard/family-members/marriages";
  const rows: RenewalRow[] = [];

  if (marriage.wedding_date) {
    const wd = calendarDateFromDb(marriage.wedding_date);
    const nextGregorian = nextAnnualGregorianOccurrence(wd.getMonth(), wd.getDate(), today);
    rows.push({
      id: `anniversary-gregorian-${marriage.id}`,
      category: "Anniversary",
      itemName: names,
      owner,
      ownerId: null,
      renewalDate: nextGregorian,
      renewalType: he ? "יום נישואין" : "Anniversary",
      href,
    });
  }

  if (marriage.wedding_hebrew_month != null && marriage.wedding_hebrew_day != null) {
    const nextHebrew = nextGregorianOccurrenceForHebrewMonthDay({
      month: marriage.wedding_hebrew_month,
      day: marriage.wedding_hebrew_day,
      fromDate: today,
    });
    if (nextHebrew) {
      rows.push({
        id: `anniversary-hebrew-${marriage.id}`,
        category: "Anniversary",
        itemName: names,
        owner,
        ownerId: null,
        renewalDate: nextHebrew,
        renewalType: hebrewOccurrenceRenewalType(
          language,
          marriage.wedding_hebrew_month,
          marriage.wedding_hebrew_day,
          nextHebrew,
        ),
        href,
      });
    }
  }

  return rows;
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
