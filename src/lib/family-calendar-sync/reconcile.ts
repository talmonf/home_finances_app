import {
  familyCalendarLiveSourceKey,
  familyCalendarSyncKey,
  formatLocalIsoDate,
  parseIsoDateOnly,
  YEARLY_OCCURRENCE_KEY,
  type DesiredFamilyCalendarEvent,
  type FamilyCalendarKind,
  type FamilyCalendarSourceKind,
} from "@/lib/family-calendar-sync/keys";
import { dateOnlyLocal } from "@/lib/hebrew-calendar";

export type ExistingFamilyCalendarMapping = {
  id: string;
  sourceKind: FamilyCalendarSourceKind;
  sourceId: string;
  calendarKind: FamilyCalendarKind;
  occurrenceKey: string;
  googleEventId: string | null;
};

export type FamilyCalendarUpsert = DesiredFamilyCalendarEvent & {
  existingEventId: string | null;
  mappingId: string | null;
};

export type FamilyCalendarReconcilePlan = {
  upserts: FamilyCalendarUpsert[];
  deletes: ExistingFamilyCalendarMapping[];
  keeps: ExistingFamilyCalendarMapping[];
};

function isPastOccurrenceKey(occurrenceKey: string, today: Date): boolean {
  if (occurrenceKey === YEARLY_OCCURRENCE_KEY) return false;
  const parsed = parseIsoDateOnly(occurrenceKey);
  if (!parsed) return false;
  return dateOnlyLocal(parsed) < dateOnlyLocal(today);
}

export function planFamilyCalendarReconcile(params: {
  desired: DesiredFamilyCalendarEvent[];
  existing: ExistingFamilyCalendarMapping[];
  liveSourceKeys: Set<string>;
  today: Date;
}): FamilyCalendarReconcilePlan {
  const existingByKey = new Map(
    params.existing.map((row) => [familyCalendarSyncKey(row), row] as const),
  );
  const desiredKeys = new Set(params.desired.map((event) => familyCalendarSyncKey(event)));
  const todayIso = formatLocalIsoDate(dateOnlyLocal(params.today));

  const upserts: FamilyCalendarUpsert[] = params.desired.map((event) => {
    const existing = existingByKey.get(familyCalendarSyncKey(event));
    return {
      ...event,
      existingEventId: existing?.googleEventId ?? null,
      mappingId: existing?.id ?? null,
    };
  });

  const deletes: ExistingFamilyCalendarMapping[] = [];
  const keeps: ExistingFamilyCalendarMapping[] = [];

  for (const row of params.existing) {
    const syncKey = familyCalendarSyncKey(row);
    if (desiredKeys.has(syncKey)) continue;

    const liveKey = familyCalendarLiveSourceKey(row.sourceKind, row.sourceId);
    if (!params.liveSourceKeys.has(liveKey)) {
      deletes.push(row);
      continue;
    }

    if (row.occurrenceKey === YEARLY_OCCURRENCE_KEY) {
      deletes.push(row);
      continue;
    }

    if (isPastOccurrenceKey(row.occurrenceKey, params.today) || row.occurrenceKey < todayIso) {
      keeps.push(row);
      continue;
    }

    deletes.push(row);
  }

  return { upserts, deletes, keeps };
}
