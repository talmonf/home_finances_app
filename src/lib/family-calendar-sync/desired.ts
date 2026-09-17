import type { FamilySpecialDateEventType } from "@/generated/prisma/enums";
import {
  resolveSpecialDateDisplayName,
  resolveSpecialDateEventTypeLabel,
} from "@/lib/family-special-dates/event-type-labels";
import {
  calendarDateFromDb,
  dateOnlyLocal,
  formatHebrewOccurrenceLabel,
  hebrewComponentsToGregorian,
  nextAnnualGregorianOccurrence,
  nextGregorianOccurrenceForHebrewMonthDay,
} from "@/lib/hebrew-calendar";
import { formatYearsSinceLabel, yearsSinceGregorian, yearsSinceHebrew } from "@/lib/upcoming-renewals/years-since";
import {
  familyCalendarLiveSourceKey,
  formatLocalIsoDate,
  isAnnualSpecialDate,
  YEARLY_OCCURRENCE_KEY,
  type DesiredFamilyCalendarEvent,
} from "@/lib/family-calendar-sync/keys";

export type FamilyCalendarMemberInput = {
  id: string;
  full_name: string;
  is_active: boolean;
  date_of_birth: Date | null;
  hebrew_date_of_birth_day: number | null;
  hebrew_date_of_birth_month: number | null;
  hebrew_date_of_birth_year: number | null;
};

export type FamilyCalendarMarriageInput = {
  id: string;
  wedding_date: Date | null;
  wedding_hebrew_day: number | null;
  wedding_hebrew_month: number | null;
  wedding_hebrew_year: number | null;
  spouse_a: { id: string; full_name: string; is_active: boolean };
  spouse_b: { id: string; full_name: string; is_active: boolean };
};

export type FamilyCalendarSpecialDateInput = {
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

export type FamilyCalendarHouseholdInput = {
  members: FamilyCalendarMemberInput[];
  marriages: FamilyCalendarMarriageInput[];
  specialDates: FamilyCalendarSpecialDateInput[];
};

export type BuildDesiredFamilyCalendarEventsParams = {
  household: FamilyCalendarHouseholdInput;
  today: Date;
  language: "en" | "he";
  baseUrl: string;
};

function dashboardUrl(baseUrl: string, href: string): string {
  return `${baseUrl.replace(/\/$/, "")}${href}`;
}

function descriptionLines(params: {
  language: "en" | "he";
  url: string;
  yearsSince?: number | null;
  extra?: string | null;
}): string {
  const he = params.language === "he";
  const lines: string[] = [];
  if (params.extra) lines.push(params.extra);
  if (params.yearsSince != null) {
    lines.push(
      he
        ? `השנה: ${formatYearsSinceLabel(params.yearsSince, "he")}`
        : `This year: ${formatYearsSinceLabel(params.yearsSince, "en")}`,
    );
  }
  lines.push(he ? `פתח באפליקציה: ${params.url}` : `Open in Home Finances: ${params.url}`);
  return lines.join("\n");
}

function pushIfPresent(target: DesiredFamilyCalendarEvent[], event: DesiredFamilyCalendarEvent | null) {
  if (event) target.push(event);
}

function gregorianYearlyEvent(params: {
  sourceKind: DesiredFamilyCalendarEvent["sourceKind"];
  sourceId: string;
  original: Date;
  today: Date;
  summary: string;
  language: "en" | "he";
  url: string;
}): DesiredFamilyCalendarEvent {
  const yearsSince = yearsSinceGregorian(params.original, nextAnnualGregorianOccurrence(
    params.original.getMonth(),
    params.original.getDate(),
    params.today,
  ));
  return {
    sourceKind: params.sourceKind,
    sourceId: params.sourceId,
    calendarKind: "gregorian",
    occurrenceKey: YEARLY_OCCURRENCE_KEY,
    startDate: formatLocalIsoDate(params.original),
    recurringYearly: true,
    summary: params.summary,
    description: descriptionLines({ language: params.language, url: params.url, yearsSince }),
  };
}

function hebrewNextOccurrenceEvent(params: {
  sourceKind: DesiredFamilyCalendarEvent["sourceKind"];
  sourceId: string;
  month: number;
  day: number;
  year: number | null;
  today: Date;
  summaryPrefix: string;
  language: "en" | "he";
  url: string;
}): DesiredFamilyCalendarEvent | null {
  const next = nextGregorianOccurrenceForHebrewMonthDay({
    month: params.month,
    day: params.day,
    fromDate: params.today,
  });
  if (!next) return null;
  const hebrewLabel = formatHebrewOccurrenceLabel(params.language, next, {
    month: params.month,
    day: params.day,
  });
  const yearsSince =
    params.year != null ? yearsSinceHebrew(params.year, next) : null;
  const summary =
    params.language === "he"
      ? `${params.summaryPrefix} · ${hebrewLabel}`
      : `${params.summaryPrefix} · ${hebrewLabel}`;
  return {
    sourceKind: params.sourceKind,
    sourceId: params.sourceId,
    calendarKind: "hebrew",
    occurrenceKey: formatLocalIsoDate(next),
    startDate: formatLocalIsoDate(next),
    recurringYearly: false,
    summary: yearsSince != null ? `${summary} · ${formatYearsSinceLabel(yearsSince, params.language)}` : summary,
    description: descriptionLines({
      language: params.language,
      url: params.url,
      extra: hebrewLabel,
      yearsSince,
    }),
  };
}

function oneTimeGregorianEvent(params: {
  sourceKind: DesiredFamilyCalendarEvent["sourceKind"];
  sourceId: string;
  date: Date;
  today: Date;
  summary: string;
  language: "en" | "he";
  url: string;
}): DesiredFamilyCalendarEvent | null {
  const local = dateOnlyLocal(params.date);
  if (local < dateOnlyLocal(params.today)) return null;
  return {
    sourceKind: params.sourceKind,
    sourceId: params.sourceId,
    calendarKind: "gregorian",
    occurrenceKey: formatLocalIsoDate(local),
    startDate: formatLocalIsoDate(local),
    recurringYearly: false,
    summary: params.summary,
    description: descriptionLines({ language: params.language, url: params.url }),
  };
}

function oneTimeHebrewEvent(params: {
  sourceKind: DesiredFamilyCalendarEvent["sourceKind"];
  sourceId: string;
  month: number;
  day: number;
  year: number | null;
  today: Date;
  summaryPrefix: string;
  language: "en" | "he";
  url: string;
}): DesiredFamilyCalendarEvent | null {
  if (params.year == null) return null;
  let occurrence: Date;
  try {
    occurrence = hebrewComponentsToGregorian({
      day: params.day,
      month: params.month,
      year: params.year,
    });
  } catch {
    return null;
  }
  if (dateOnlyLocal(occurrence) < dateOnlyLocal(params.today)) return null;
  const hebrewLabel = formatHebrewOccurrenceLabel(params.language, occurrence, {
    month: params.month,
    day: params.day,
  });
  return {
    sourceKind: params.sourceKind,
    sourceId: params.sourceId,
    calendarKind: "hebrew",
    occurrenceKey: formatLocalIsoDate(occurrence),
    startDate: formatLocalIsoDate(occurrence),
    recurringYearly: false,
    summary: `${params.summaryPrefix} · ${hebrewLabel}`,
    description: descriptionLines({
      language: params.language,
      url: params.url,
      extra: hebrewLabel,
    }),
  };
}

function birthdayEvents(
  member: FamilyCalendarMemberInput,
  today: Date,
  language: "en" | "he",
  baseUrl: string,
): DesiredFamilyCalendarEvent[] {
  if (!member.is_active) return [];
  const url = dashboardUrl(baseUrl, `/dashboard/family-members/${member.id}`);
  const prefix = language === "he" ? `יום הולדת: ${member.full_name}` : `Birthday: ${member.full_name}`;
  const events: DesiredFamilyCalendarEvent[] = [];
  if (member.date_of_birth) {
    events.push(
      gregorianYearlyEvent({
        sourceKind: "birthday",
        sourceId: member.id,
        original: calendarDateFromDb(member.date_of_birth),
        today,
        summary: prefix,
        language,
        url,
      }),
    );
  }
  if (member.hebrew_date_of_birth_month != null && member.hebrew_date_of_birth_day != null) {
    pushIfPresent(
      events,
      hebrewNextOccurrenceEvent({
        sourceKind: "birthday",
        sourceId: member.id,
        month: member.hebrew_date_of_birth_month,
        day: member.hebrew_date_of_birth_day,
        year: member.hebrew_date_of_birth_year,
        today,
        summaryPrefix: prefix,
        language,
        url,
      }),
    );
  }
  return events;
}

function anniversaryEvents(
  marriage: FamilyCalendarMarriageInput,
  today: Date,
  language: "en" | "he",
  baseUrl: string,
): DesiredFamilyCalendarEvent[] {
  if (!marriage.spouse_a.is_active || !marriage.spouse_b.is_active) return [];
  const names = `${marriage.spouse_a.full_name} & ${marriage.spouse_b.full_name}`;
  const prefix = language === "he" ? `יום נישואין: ${names}` : `Anniversary: ${names}`;
  const url = dashboardUrl(baseUrl, "/dashboard/family-members/marriages");
  const events: DesiredFamilyCalendarEvent[] = [];
  if (marriage.wedding_date) {
    events.push(
      gregorianYearlyEvent({
        sourceKind: "anniversary",
        sourceId: marriage.id,
        original: calendarDateFromDb(marriage.wedding_date),
        today,
        summary: prefix,
        language,
        url,
      }),
    );
  }
  if (marriage.wedding_hebrew_month != null && marriage.wedding_hebrew_day != null) {
    pushIfPresent(
      events,
      hebrewNextOccurrenceEvent({
        sourceKind: "anniversary",
        sourceId: marriage.id,
        month: marriage.wedding_hebrew_month,
        day: marriage.wedding_hebrew_day,
        year: marriage.wedding_hebrew_year,
        today,
        summaryPrefix: prefix,
        language,
        url,
      }),
    );
  }
  return events;
}

function specialDateEvents(
  record: FamilyCalendarSpecialDateInput,
  today: Date,
  language: "en" | "he",
  baseUrl: string,
): DesiredFamilyCalendarEvent[] {
  if (record.family_member && !record.family_member.is_active) return [];
  const itemName = resolveSpecialDateDisplayName({
    display_name: record.display_name,
    family_member: record.family_member,
  });
  const eventTypeLabel = resolveSpecialDateEventTypeLabel({
    event_type: record.event_type,
    event_type_other: record.event_type_other,
    language,
  });
  const prefix = `${eventTypeLabel}: ${itemName}`;
  const url = dashboardUrl(baseUrl, `/dashboard/family-members/special-dates/${record.id}/edit`);
  const annual = isAnnualSpecialDate(record.event_type);
  const events: DesiredFamilyCalendarEvent[] = [];

  if (record.gregorian_date) {
    const original = calendarDateFromDb(record.gregorian_date);
    if (annual) {
      events.push(
        gregorianYearlyEvent({
          sourceKind: "special_date",
          sourceId: record.id,
          original,
          today,
          summary: prefix,
          language,
          url,
        }),
      );
    } else {
      pushIfPresent(
        events,
        oneTimeGregorianEvent({
          sourceKind: "special_date",
          sourceId: record.id,
          date: original,
          today,
          summary: prefix,
          language,
          url,
        }),
      );
    }
  }

  if (record.hebrew_month != null && record.hebrew_day != null) {
    if (annual) {
      pushIfPresent(
        events,
        hebrewNextOccurrenceEvent({
          sourceKind: "special_date",
          sourceId: record.id,
          month: record.hebrew_month,
          day: record.hebrew_day,
          year: record.hebrew_year,
          today,
          summaryPrefix: prefix,
          language,
          url,
        }),
      );
    } else {
      pushIfPresent(
        events,
        oneTimeHebrewEvent({
          sourceKind: "special_date",
          sourceId: record.id,
          month: record.hebrew_month,
          day: record.hebrew_day,
          year: record.hebrew_year,
          today,
          summaryPrefix: prefix,
          language,
          url,
        }),
      );
    }
  }

  return events;
}

export function liveFamilyCalendarSourceKeys(household: FamilyCalendarHouseholdInput): Set<string> {
  const keys = new Set<string>();
  for (const member of household.members) {
    if (member.is_active) keys.add(familyCalendarLiveSourceKey("birthday", member.id));
  }
  for (const marriage of household.marriages) {
    if (marriage.spouse_a.is_active && marriage.spouse_b.is_active) {
      keys.add(familyCalendarLiveSourceKey("anniversary", marriage.id));
    }
  }
  for (const record of household.specialDates) {
    if (record.family_member && !record.family_member.is_active) continue;
    keys.add(familyCalendarLiveSourceKey("special_date", record.id));
  }
  return keys;
}

export function buildDesiredFamilyCalendarEvents(
  params: BuildDesiredFamilyCalendarEventsParams,
): DesiredFamilyCalendarEvent[] {
  const { household, today, language, baseUrl } = params;
  const events: DesiredFamilyCalendarEvent[] = [];
  for (const member of household.members) {
    events.push(...birthdayEvents(member, today, language, baseUrl));
  }
  for (const marriage of household.marriages) {
    events.push(...anniversaryEvents(marriage, today, language, baseUrl));
  }
  for (const record of household.specialDates) {
    events.push(...specialDateEvents(record, today, language, baseUrl));
  }
  return events;
}
