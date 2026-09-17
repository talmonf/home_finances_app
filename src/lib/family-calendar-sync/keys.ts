import type { FamilySpecialDateEventType } from "@/generated/prisma/enums";

export const YEARLY_OCCURRENCE_KEY = "yearly";

export const ONE_TIME_SPECIAL_DATE_TYPES = new Set<FamilySpecialDateEventType>([
  "bar_mitzvah",
  "bat_mitzvah",
  "engagement",
  "aliyah",
  "graduation",
]);

export function isAnnualSpecialDate(eventType: FamilySpecialDateEventType): boolean {
  return !ONE_TIME_SPECIAL_DATE_TYPES.has(eventType);
}

export type FamilyCalendarSourceKind = "birthday" | "anniversary" | "special_date";
export type FamilyCalendarKind = "gregorian" | "hebrew";

export type DesiredFamilyCalendarEvent = {
  sourceKind: FamilyCalendarSourceKind;
  sourceId: string;
  calendarKind: FamilyCalendarKind;
  occurrenceKey: string;
  startDate: string;
  recurringYearly: boolean;
  summary: string;
  description: string;
};

export type FamilyCalendarMappingKey = Pick<
  DesiredFamilyCalendarEvent,
  "sourceKind" | "sourceId" | "calendarKind" | "occurrenceKey"
>;

export function familyCalendarSyncKey(event: FamilyCalendarMappingKey): string {
  return `${event.sourceKind}:${event.sourceId}:${event.calendarKind}:${event.occurrenceKey}`;
}

export function familyCalendarLiveSourceKey(
  sourceKind: FamilyCalendarSourceKind,
  sourceId: string,
): string {
  return `${sourceKind}:${sourceId}`;
}

export function formatLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDateOnly(isoDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}
