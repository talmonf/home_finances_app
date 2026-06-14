import { prisma } from "@/lib/auth";
import {
  resolveSpecialDateDisplayName,
  resolveSpecialDateEventTypeLabel,
} from "@/lib/family-special-dates/event-type-labels";
import type { FamilySpecialDateEventType } from "@/generated/prisma/enums";
import {
  calendarDateFromDb,
  formatHebrewDateLabel,
  formatHebrewNightDayRangeLabel,
  gregorianDateToHebrewComponents,
  nextAnnualGregorianOccurrence,
  nextGregorianOccurrenceForHebrewMonthDay,
  passedGregorianOccurrenceThisCycle,
  passedHebrewOccurrenceThisCycle,
} from "@/lib/hebrew-calendar";
import { dateOnlyLocal, type RenewalRow } from "@/lib/upcoming-renewals/compute";

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

type SpecialDateRow = {
  id: string;
  display_name: string | null;
  event_type: FamilySpecialDateEventType;
  event_type_other: string | null;
  gregorian_date: Date | null;
  hebrew_day: number | null;
  hebrew_month: number | null;
  hebrew_year: number | null;
  family_member: { id: string; full_name: string; is_active: boolean } | null;
};

function formatPassedHebrewNote(
  language: "en" | "he",
  month: number,
  day: number,
  passedOccurrenceDate: Date,
): string {
  const h = gregorianDateToHebrewComponents(passedOccurrenceDate);
  const label = formatHebrewDateLabel({ day, month, year: h.year }, language);
  const timing = formatHebrewNightDayRangeLabel(language, passedOccurrenceDate);
  return language === "he"
    ? `עברי: ${label} (${timing}) — עבר`
    : `Hebrew: ${label} (${timing}) — already passed`;
}

function formatPassedGregorianNote(language: "en" | "he", passedOccurrenceDate: Date): string {
  const dd = String(passedOccurrenceDate.getDate()).padStart(2, "0");
  const mm = String(passedOccurrenceDate.getMonth() + 1).padStart(2, "0");
  const yyyy = passedOccurrenceDate.getFullYear();
  const dateLabel = `${dd}/${mm}/${yyyy}`;
  return language === "he"
    ? `לועזי: ${dateLabel} — עבר`
    : `Gregorian: ${dateLabel} — already passed`;
}

function consolidateDualCalendarRows(params: {
  today: Date;
  language: "en" | "he";
  gregorianRow: RenewalRow | null;
  hebrewRow: RenewalRow | null;
  gregorianMonthDay?: { month: number; day: number };
  hebrewMonthDay?: { month: number; day: number };
}): RenewalRow[] {
  const { today, language, gregorianRow, hebrewRow, gregorianMonthDay, hebrewMonthDay } = params;
  if (!gregorianRow && !hebrewRow) return [];
  if (!gregorianRow) return [hebrewRow!];
  if (!hebrewRow) return [gregorianRow];

  const todayD = dateOnlyLocal(today);
  const gUpcoming = dateOnlyLocal(gregorianRow.renewalDate) >= todayD;
  const hUpcoming = dateOnlyLocal(hebrewRow.renewalDate) >= todayD;

  const passedHebrew =
    hebrewMonthDay != null
      ? passedHebrewOccurrenceThisCycle(hebrewMonthDay.month, hebrewMonthDay.day, today)
      : null;
  const passedGregorian =
    gregorianMonthDay != null
      ? passedGregorianOccurrenceThisCycle(
          gregorianMonthDay.month,
          gregorianMonthDay.day,
          today,
        )
      : null;

  if (passedHebrew && gUpcoming) {
    return [
      {
        ...gregorianRow,
        extraEmailSegments: [
          formatPassedHebrewNote(
            language,
            hebrewMonthDay!.month,
            hebrewMonthDay!.day,
            passedHebrew,
          ),
        ],
      },
    ];
  }

  if (passedGregorian && hUpcoming) {
    return [
      {
        ...hebrewRow,
        extraEmailSegments: [formatPassedGregorianNote(language, passedGregorian)],
      },
    ];
  }

  if (gUpcoming && hUpcoming) {
    return [gregorianRow, hebrewRow];
  }

  return [gregorianRow, hebrewRow];
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
  const timing = formatHebrewNightDayRangeLabel(language, occurrenceDate);
  return language === "he" ? `עברי: ${label} (${timing})` : `Hebrew: ${label} (${timing})`;
}

function birthdayRowsForMember(
  member: FamilyMemberRow,
  today: Date,
  language: "en" | "he",
): RenewalRow[] {
  const he = language === "he";
  const href = `/dashboard/family-members/${member.id}`;

  let gregorianRow: RenewalRow | null = null;
  let gregorianMonthDay: { month: number; day: number } | undefined;
  let hebrewRow: RenewalRow | null = null;
  let hebrewMonthDay: { month: number; day: number } | undefined;

  if (member.date_of_birth) {
    const dob = calendarDateFromDb(member.date_of_birth);
    const nextGregorian = nextAnnualGregorianOccurrence(
      dob.getMonth(),
      dob.getDate(),
      today,
    );
    gregorianMonthDay = { month: dob.getMonth(), day: dob.getDate() };
    gregorianRow = {
      id: `birthday-gregorian-${member.id}`,
      category: "Birthday",
      itemName: member.full_name,
      owner: member.full_name,
      ownerId: member.id,
      renewalDate: nextGregorian,
      renewalType: he ? "יום הולדת" : "Birthday",
      href,
    };
  }

  if (member.hebrew_date_of_birth_month != null && member.hebrew_date_of_birth_day != null) {
    const nextHebrew = nextGregorianOccurrenceForHebrewMonthDay({
      month: member.hebrew_date_of_birth_month,
      day: member.hebrew_date_of_birth_day,
      fromDate: today,
    });
    if (nextHebrew) {
      hebrewMonthDay = {
        month: member.hebrew_date_of_birth_month,
        day: member.hebrew_date_of_birth_day,
      };
      hebrewRow = {
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
      };
    }
  }

  return consolidateDualCalendarRows({
    today,
    language,
    gregorianRow,
    hebrewRow,
    gregorianMonthDay,
    hebrewMonthDay,
  });
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

  let gregorianRow: RenewalRow | null = null;
  let gregorianMonthDay: { month: number; day: number } | undefined;
  let hebrewRow: RenewalRow | null = null;
  let hebrewMonthDay: { month: number; day: number } | undefined;

  if (marriage.wedding_date) {
    const wd = calendarDateFromDb(marriage.wedding_date);
    const nextGregorian = nextAnnualGregorianOccurrence(wd.getMonth(), wd.getDate(), today);
    gregorianMonthDay = { month: wd.getMonth(), day: wd.getDate() };
    gregorianRow = {
      id: `anniversary-gregorian-${marriage.id}`,
      category: "Anniversary",
      itemName: names,
      owner,
      ownerId: null,
      renewalDate: nextGregorian,
      renewalType: he ? "יום נישואין" : "Anniversary",
      href,
    };
  }

  if (marriage.wedding_hebrew_month != null && marriage.wedding_hebrew_day != null) {
    const nextHebrew = nextGregorianOccurrenceForHebrewMonthDay({
      month: marriage.wedding_hebrew_month,
      day: marriage.wedding_hebrew_day,
      fromDate: today,
    });
    if (nextHebrew) {
      hebrewMonthDay = {
        month: marriage.wedding_hebrew_month,
        day: marriage.wedding_hebrew_day,
      };
      hebrewRow = {
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
      };
    }
  }

  return consolidateDualCalendarRows({
    today,
    language,
    gregorianRow,
    hebrewRow,
    gregorianMonthDay,
    hebrewMonthDay,
  });
}

function specialDateRowsForRecord(
  record: SpecialDateRow,
  today: Date,
  language: "en" | "he",
): RenewalRow[] {
  if (record.family_member && !record.family_member.is_active) {
    return [];
  }

  const itemName = resolveSpecialDateDisplayName({
    display_name: record.display_name,
    family_member: record.family_member,
  });
  const eventTypeLabel = resolveSpecialDateEventTypeLabel({
    event_type: record.event_type,
    event_type_other: record.event_type_other,
    language,
  });
  const href = `/dashboard/family-members/special-dates/${record.id}/edit`;
  const ownerId = record.family_member?.id ?? null;
  const owner = itemName;

  let gregorianRow: RenewalRow | null = null;
  let gregorianMonthDay: { month: number; day: number } | undefined;
  let hebrewRow: RenewalRow | null = null;
  let hebrewMonthDay: { month: number; day: number } | undefined;

  if (record.gregorian_date) {
    const gd = calendarDateFromDb(record.gregorian_date);
    const nextGregorian = nextAnnualGregorianOccurrence(gd.getMonth(), gd.getDate(), today);
    gregorianMonthDay = { month: gd.getMonth(), day: gd.getDate() };
    gregorianRow = {
      id: `special-date-gregorian-${record.id}`,
      category: "Special date",
      itemName,
      owner,
      ownerId,
      renewalDate: nextGregorian,
      renewalType: eventTypeLabel,
      href,
    };
  }

  if (record.hebrew_month != null && record.hebrew_day != null) {
    const nextHebrew = nextGregorianOccurrenceForHebrewMonthDay({
      month: record.hebrew_month,
      day: record.hebrew_day,
      fromDate: today,
    });
    if (nextHebrew) {
      hebrewMonthDay = { month: record.hebrew_month, day: record.hebrew_day };
      hebrewRow = {
        id: `special-date-hebrew-${record.id}`,
        category: "Special date",
        itemName,
        owner,
        ownerId,
        renewalDate: nextHebrew,
        renewalType: hebrewOccurrenceRenewalType(
          language,
          record.hebrew_month,
          record.hebrew_day,
          nextHebrew,
        ),
        href,
      };
    }
  }

  return consolidateDualCalendarRows({
    today,
    language,
    gregorianRow,
    hebrewRow,
    gregorianMonthDay,
    hebrewMonthDay,
  });
}

export async function loadUpcomingFamilyEventRows(params: {
  householdId: string;
  today: Date;
  language: "en" | "he";
}): Promise<RenewalRow[]> {
  const { householdId, today, language } = params;

  const [members, marriages, specialDates] = await Promise.all([
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
    prisma.family_special_dates.findMany({
      where: { household_id: householdId },
      include: {
        family_member: { select: { id: true, full_name: true, is_active: true } },
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
  for (const record of specialDates) {
    rows.push(...specialDateRowsForRecord(record, today, language));
  }
  return rows;
}

/** @internal Exported for unit tests only. */
export function consolidateDualCalendarRowsForTest(params: {
  today: Date;
  language: "en" | "he";
  gregorianRow: RenewalRow | null;
  hebrewRow: RenewalRow | null;
  gregorianMonthDay?: { month: number; day: number };
  hebrewMonthDay?: { month: number; day: number };
}): RenewalRow[] {
  return consolidateDualCalendarRows(params);
}
