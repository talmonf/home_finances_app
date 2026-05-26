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

function birthdayRowsForMember(
  member: FamilyMemberRow,
  today: Date,
  language: "en" | "he",
): RenewalRow[] {
  const he = language === "he";
  const rows: RenewalRow[] = [];

  if (member.hebrew_date_of_birth_month != null && member.hebrew_date_of_birth_day != null) {
    const next = nextGregorianOccurrenceForHebrewMonthDay({
      month: member.hebrew_date_of_birth_month,
      day: member.hebrew_date_of_birth_day,
      fromDate: today,
    });
    if (next) {
      const label = formatHebrewDateLabel(
        {
          day: member.hebrew_date_of_birth_day,
          month: member.hebrew_date_of_birth_month,
          year: member.hebrew_date_of_birth_year,
        },
        language,
      );
      rows.push({
        id: `birthday-hebrew-${member.id}`,
        category: "Birthday",
        itemName: member.full_name,
        owner: member.full_name,
        ownerId: member.id,
        renewalDate: next,
        renewalType: he ? `יום הולדת עברי (${label})` : `Hebrew birthday (${label})`,
        href: `/dashboard/family-members/${member.id}`,
      });
    }
  }

  if (member.date_of_birth) {
    const dob = calendarDateFromDb(member.date_of_birth);
    const next = nextAnnualGregorianOccurrence(
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
      renewalDate: next,
      renewalType: he ? "יום הולדת" : "Birthday",
      href: `/dashboard/family-members/${member.id}`,
    });
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
  const rows: RenewalRow[] = [];

  if (marriage.wedding_hebrew_month != null && marriage.wedding_hebrew_day != null) {
    const next = nextGregorianOccurrenceForHebrewMonthDay({
      month: marriage.wedding_hebrew_month,
      day: marriage.wedding_hebrew_day,
      fromDate: today,
    });
    if (next) {
      const label = formatHebrewDateLabel(
        {
          day: marriage.wedding_hebrew_day,
          month: marriage.wedding_hebrew_month,
          year: marriage.wedding_hebrew_year,
        },
        language,
      );
      rows.push({
        id: `anniversary-hebrew-${marriage.id}`,
        category: "Anniversary",
        itemName: names,
        owner: names,
        ownerId: null,
        renewalDate: next,
        renewalType: he ? `יום נישואין עברי (${label})` : `Hebrew anniversary (${label})`,
        href: "/dashboard/family-members/marriages",
      });
    }
  }

  if (marriage.wedding_date) {
    const wd = calendarDateFromDb(marriage.wedding_date);
    const next = nextAnnualGregorianOccurrence(wd.getMonth(), wd.getDate(), today);
    rows.push({
      id: `anniversary-gregorian-${marriage.id}`,
      category: "Anniversary",
      itemName: names,
      owner: names,
      ownerId: null,
      renewalDate: next,
      renewalType: he ? "יום נישואין" : "Anniversary",
      href: "/dashboard/family-members/marriages",
    });
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
