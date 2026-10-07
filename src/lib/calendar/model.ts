import { nextAnnualGregorianOccurrence } from "@/lib/hebrew-calendar";
import { logTreatmentHref } from "@/lib/therapy/log-treatment";

export const CALENDAR_PATH = "/dashboard/calendar";

export const CALENDAR_RENEWAL_SKIP_CATEGORIES = new Set([
  "Birthday",
  "Anniversary",
  "Special date",
  "Task",
]);

export type CalendarView = "day" | "week" | "month";

export type CalendarEventKind =
  | "clinicAppointment"
  | "clinicConsultation"
  | "clinicVisit"
  | "familyDate"
  | "medical"
  | "task"
  | "renewal";

const CLINIC_EVENT_KINDS: CalendarEventKind[] = ["clinicAppointment", "clinicConsultation", "clinicVisit"];
const HOME_EVENT_KINDS: CalendarEventKind[] = ["familyDate", "medical", "task", "renewal"];

/** Category chips for the enabled modules. Clinic kinds come first when both are on. */
export function calendarKindsForModules(flags: {
  clinicEnabled: boolean;
  householdEnabled: boolean;
}): CalendarEventKind[] {
  return [
    ...(flags.clinicEnabled ? CLINIC_EVENT_KINDS : []),
    ...(flags.householdEnabled ? HOME_EVENT_KINDS : []),
  ];
}

export type CalendarEventAction =
  | { kind: "visit"; scheduleHref: string; logTreatmentHref: string }
  | {
      kind: "appointment";
      rescheduleHref: string | null;
      reportHref: string | null;
      seriesId: string | null;
      occurrenceDate: string | null;
    }
  | {
      kind: "consultation";
      rescheduleHref: string;
      reportHref: string;
      cancelHref: string;
    };

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  title: string;
  subtitle: string | null;
  /** Local calendar day, yyyy-mm-dd. */
  date: string;
  /** Minutes from midnight in Israel for timed events. Null for all-day. */
  startMinutes: number | null;
  endMinutes: number | null;
  href: string | null;
  overdue: boolean;
  hover: string | null;
  action: CalendarEventAction | null;
};

export type UnscheduledVisitCandidate = {
  clientId: string;
  onHold: boolean;
  cadenceDue: Date | null;
  hasUpcomingAppointment: boolean;
};

export type UnscheduledVisitPin = {
  clientId: string;
  due: Date;
  overdue: boolean;
};

export function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(base: Date, n: number): Date {
  const x = dateOnly(base);
  x.setDate(x.getDate() + n);
  return x;
}

export function isoDateLocal(d: Date): string {
  const x = dateOnly(d);
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
}

export function parseCalendarView(raw: string | undefined): CalendarView {
  if (raw === "day" || raw === "week" || raw === "month") return raw;
  return "month";
}

export function parseAnchorDate(raw: string | undefined, today: Date): Date {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return dateOnly(today);
  const [y, m, d] = raw.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== (m ?? 1) - 1 || dt.getDate() !== d) {
    return dateOnly(today);
  }
  return dt;
}

export function calendarHref(view: CalendarView, date: Date): string {
  return `${CALENDAR_PATH}?view=${view}&date=${isoDateLocal(date)}`;
}

/** Sunday-start days covering the day, week, or month grid for `anchor`. */
export function daysForView(view: CalendarView, anchor: Date): Date[] {
  const day = dateOnly(anchor);
  if (view === "day") return [day];
  if (view === "week") {
    const start = addDays(day, -day.getDay());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  const first = new Date(day.getFullYear(), day.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function shiftAnchor(view: CalendarView, anchor: Date, direction: -1 | 1): Date {
  const day = dateOnly(anchor);
  if (view === "day") return addDays(day, direction);
  if (view === "week") return addDays(day, direction * 7);
  const next = new Date(day.getFullYear(), day.getMonth() + direction, 1);
  const dim = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day.getDate(), dim));
  return next;
}

export function rangeIncludesDate(days: readonly Date[], target: Date): boolean {
  const iso = isoDateLocal(target);
  return days.some((d) => isoDateLocal(d) === iso);
}

/** True when the day, week, or month on screen is the one that contains today. */
export function isCurrentCalendarPeriod(view: CalendarView, anchor: Date, today: Date): boolean {
  const day = dateOnly(anchor);
  const now = dateOnly(today);
  if (view === "month") {
    return day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth();
  }
  if (view === "week") {
    return rangeIncludesDate(daysForView("week", day), now);
  }
  return isoDateLocal(day) === isoDateLocal(now);
}

/**
 * Cadence pins for clients who are not on hold, have a due date, and do not already
 * have an upcoming scheduled appointment.
 */
export function selectUnscheduledVisits(
  candidates: readonly UnscheduledVisitCandidate[],
  today: Date,
): UnscheduledVisitPin[] {
  const todayDay = dateOnly(today);
  const pins: UnscheduledVisitPin[] = [];
  for (const candidate of candidates) {
    if (candidate.onHold || candidate.hasUpcomingAppointment || !candidate.cadenceDue) continue;
    const due = dateOnly(candidate.cadenceDue);
    pins.push({
      clientId: candidate.clientId,
      due,
      overdue: due < todayDay,
    });
  }
  return pins;
}

/** Overdue unscheduled visits, listed when the visible range includes today. */
export function overdueVisitsForStrip(
  pins: readonly UnscheduledVisitPin[],
  visibleDays: readonly Date[],
  today: Date,
): UnscheduledVisitPin[] {
  if (!rangeIncludesDate(visibleDays, today)) return [];
  return pins.filter((pin) => pin.overdue);
}

export function pinsInVisibleRange(
  pins: readonly UnscheduledVisitPin[],
  visibleDays: readonly Date[],
): UnscheduledVisitPin[] {
  const isos = new Set(visibleDays.map((d) => isoDateLocal(d)));
  return pins.filter((pin) => isos.has(isoDateLocal(pin.due)));
}

export type RenewalLike = {
  id: string;
  category: string;
  renewalDate: Date;
};

/** Drop family dates and tasks (loaded separately) and keep rows whose date is in range. */
export function calendarRenewalRows<T extends RenewalLike>(
  rows: readonly T[],
  rangeStart: Date,
  rangeEnd: Date,
): T[] {
  const start = dateOnly(rangeStart);
  const end = dateOnly(rangeEnd);
  return rows.filter((row) => {
    if (CALENDAR_RENEWAL_SKIP_CATEGORIES.has(row.category)) return false;
    const rd = dateOnly(row.renewalDate);
    return rd >= start && rd <= end;
  });
}

/** Gregorian month/day occurrence inside the range, or null. Month is 0-based. */
export function annualDateInRange(
  monthZeroBased: number,
  day: number,
  rangeStart: Date,
  rangeEnd: Date,
): Date | null {
  const next = nextAnnualGregorianOccurrence(monthZeroBased, day, dateOnly(rangeStart));
  if (dateOnly(next) <= dateOnly(rangeEnd)) return next;
  return null;
}

export function scheduleAppointmentHref(params: {
  clientId: string;
  jobId: string | null;
  programId: string | null;
  visitType: string | null;
  startDate: Date;
  durationMinutes: number | null;
  today: Date;
  overdue: boolean;
}): string {
  const start = params.overdue ? dateOnly(params.today) : dateOnly(params.startDate);
  const qp = new URLSearchParams({
    from: "calendar",
    client: params.clientId,
    job: params.jobId ?? "",
    program: params.programId ?? "",
    visitType: params.visitType ?? "clinic",
    startDate: isoDateLocal(start),
  });
  if (params.durationMinutes != null) {
    qp.set("durationMinutes", String(params.durationMinutes));
  }
  return `/dashboard/private-clinic/appointments/new?${qp.toString()}`;
}

export function visitLogTreatmentHref(clientId: string): string {
  return logTreatmentHref({ clientId, from: "calendar" });
}

export function appointmentReportHref(clientId: string, appointmentId: string): string {
  return logTreatmentHref({ clientId, appointmentId, from: "calendar" });
}

export function appointmentRescheduleHref(appointmentId: string): string {
  return `/dashboard/private-clinic/appointments/${encodeURIComponent(appointmentId)}/reschedule?from=calendar`;
}

export function consultationReportHref(consultationId: string): string {
  return `/dashboard/private-clinic/consultations?modal=edit&edit_id=${encodeURIComponent(consultationId)}&report=1`;
}

export function consultationRescheduleHref(consultationId: string): string {
  return `/dashboard/private-clinic/consultations?modal=reschedule&edit_id=${encodeURIComponent(consultationId)}`;
}

export function consultationCancelHref(consultationId: string): string {
  return `/dashboard/private-clinic/consultations?modal=cancel&edit_id=${encodeURIComponent(consultationId)}`;
}

/** Every monthly due date in [rangeStart, rangeEnd], including a due date that falls on rangeStart. */
export function monthlyOccurrencesInRange(dayOfMonth: number, rangeStart: Date, rangeEnd: Date): Date[] {
  const start = dateOnly(rangeStart);
  const end = dateOnly(rangeEnd);
  if (end < start) return [];
  const dates: Date[] = [];
  let year = start.getFullYear();
  let month = start.getMonth();
  for (let guard = 0; guard < 36; guard++) {
    const dim = new Date(year, month + 1, 0).getDate();
    const day = Math.min(dayOfMonth, dim);
    const candidate = new Date(year, month, day);
    if (candidate > end) break;
    if (candidate >= start) dates.push(candidate);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return dates;
}

export function hourWindow(
  events: readonly Pick<CalendarEvent, "startMinutes" | "endMinutes">[],
): { startHour: number; endHour: number } {
  let start = 7;
  let end = 20;
  for (const event of events) {
    if (event.startMinutes == null) continue;
    start = Math.min(start, Math.floor(event.startMinutes / 60));
    const endMin = event.endMinutes ?? event.startMinutes + 60;
    end = Math.max(end, Math.ceil(endMin / 60));
  }
  start = Math.max(0, Math.min(start, 23));
  end = Math.min(24, Math.max(end, start + 1));
  return { startHour: start, endHour: end };
}
