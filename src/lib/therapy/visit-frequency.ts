import { addDays, dateOnlyLocal } from "@/lib/private-clinic/reminders-logic";

export function parseVisitCount(raw: string | null | undefined): number | null {
  const n = Number((raw ?? "").trim());
  if (!Number.isFinite(n)) return null;
  const int = Math.trunc(n);
  if (int < 1 || int > 14) return null;
  return int;
}

export function parseVisitWeeks(raw: string | null | undefined): number | null {
  const n = Number((raw ?? "").trim());
  if (!Number.isFinite(n)) return null;
  const int = Math.trunc(n);
  if (int < 1 || int > 12) return null;
  return int;
}

/** Calendar days between visits when spacing N visits evenly across W weeks. */
export function averageDaysBetweenVisits(visitsPerPeriod: number, weeksInPeriod: number): number {
  return (weeksInPeriod * 7) / visitsPerPeriod;
}

/**
 * Next due date after the last logged treatment: last visit day + ceil(average day spacing).
 */
export function nextVisitDueDateAfterLastTreatment(
  lastOccurredAt: Date,
  visitsPerPeriod: number,
  weeksInPeriod: number,
): Date {
  const lastDay = dateOnlyLocal(lastOccurredAt);
  const days = Math.ceil(averageDaysBetweenVisits(visitsPerPeriod, weeksInPeriod));
  return addDays(lastDay, days);
}

/**
 * Effective next-visit date for upcoming-visits style lists.
 * On hold → none. Else a scheduled appointment date overrides cadence.
 * Cancelling the appointment restores cadence automatically (no scheduled start).
 */
export function effectiveNextVisitDue(params: {
  onHold: boolean;
  scheduledStartAt?: Date | null;
  cadenceDue?: Date | null;
}): Date | null {
  if (params.onHold) return null;
  if (params.scheduledStartAt) return dateOnlyLocal(params.scheduledStartAt);
  return params.cadenceDue ?? null;
}
