import { prisma } from "@/lib/auth";
import { loadUpcomingFamilyEventRows } from "@/lib/family-events/upcoming";
import {
  formatHouseholdDate,
  formatIsoDateStringForHousehold,
  getDateTimePartsInIsraelTime,
  type HouseholdDateDisplayFormat,
} from "@/lib/household-date-format";
import { DASHBOARD_SECTIONS, type SectionId } from "@/lib/dashboard-sections";
import { isEffectiveDashboardSectionEnabled, type EnabledSection } from "@/lib/household-sections";
import { maskSensitiveText } from "@/lib/privacy-display";
import {
  jobWherePrivateClinicScoped,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";
import { dateOnlyLocal } from "@/lib/private-clinic/reminders-logic";
import {
  getUpcomingAppointmentsForHousehold,
  nextScheduledAppointmentByClientId,
} from "@/lib/therapy/series-occurrences";
import { nextVisitDueDateAfterLastTreatment } from "@/lib/therapy/visit-frequency";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import type { UiLanguage } from "@/lib/ui-language";
import { computeUpcomingRenewals, dateOnlyLocal as renewalDateOnly } from "@/lib/upcoming-renewals/compute";
import {
  addDays,
  appointmentReportHref,
  appointmentRescheduleHref,
  calendarRenewalRows,
  dateOnly,
  isoDateLocal,
  overdueVisitsForStrip,
  pinsInVisibleRange,
  scheduleAppointmentHref,
  selectUnscheduledVisits,
  visitLogTreatmentHref,
  type CalendarEvent,
  type CalendarEventKind,
} from "@/lib/calendar/model";
import { calendarStrings } from "@/lib/calendar/strings";

const SECTION_FAMILY: SectionId = "familyMembers";
const SECTION_MEDICAL: SectionId = "medicalAppointments";
const SECTION_TASKS: SectionId = "tasks";
const SECTION_RENEWALS: SectionId = "upcomingRenewals";
const SECTION_CLINIC: SectionId = "privateClinic";

export function enabledSectionIdSet(sections: readonly EnabledSection[]): Set<string> {
  const ids = new Set<string>();
  for (const section of DASHBOARD_SECTIONS) {
    if (isEffectiveDashboardSectionEnabled([...sections], section.id)) ids.add(section.id);
  }
  return ids;
}

function endOfLocalDay(d: Date): Date {
  const x = dateOnly(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function israelPlacement(startAt: Date, durationMinutes: number | null): {
  date: string;
  startMinutes: number;
  endMinutes: number;
} {
  const parts = getDateTimePartsInIsraelTime(startAt);
  const startMinutes = parts.hour * 60 + parts.minute;
  const duration = durationMinutes != null && durationMinutes > 0 ? durationMinutes : 60;
  return {
    date: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    startMinutes,
    endMinutes: startMinutes + duration,
  };
}

function maskTitle(obfuscate: boolean, event: CalendarEvent): CalendarEvent {
  if (!obfuscate) return event;
  return { ...event, title: maskSensitiveText(true, event.title) };
}

function inDaySet(iso: string, days: readonly Date[]): boolean {
  return days.some((d) => isoDateLocal(d) === iso);
}

export async function loadCalendarEvents(params: {
  householdId: string;
  familyMemberId: string | null;
  rangeStart: Date;
  rangeEnd: Date;
  visibleDays: readonly Date[];
  today: Date;
  language: UiLanguage;
  dateDisplayFormat: HouseholdDateDisplayFormat;
  obfuscate: boolean;
  enabledSectionIds: ReadonlySet<string>;
}): Promise<CalendarEvent[]> {
  const copy = calendarStrings(params.language);
  const events: CalendarEvent[] = [];
  const today = dateOnly(params.today);
  const rangeStart = dateOnly(params.rangeStart);
  const rangeEnd = dateOnly(params.rangeEnd);

  if (params.enabledSectionIds.has(SECTION_CLINIC)) {
    events.push(
      ...(await loadClinicEvents({
        ...params,
        today,
        rangeStart,
        rangeEnd,
        lastVisitLabel: copy.lastVisit,
        noLastVisit: copy.noLastVisit,
        estimatedLabel: copy.kinds.clinicVisit,
      })),
    );
  }

  if (params.enabledSectionIds.has(SECTION_FAMILY)) {
    const familyRows = await loadUpcomingFamilyEventRows({
      householdId: params.householdId,
      today: rangeStart,
      language: params.language,
    });
    for (const row of familyRows) {
      const due = renewalDateOnly(row.renewalDate);
      const iso = isoDateLocal(due);
      if (!inDaySet(iso, params.visibleDays)) continue;
      const subtitle = [row.category, row.renewalType].filter(Boolean).join(" · ");
      events.push({
        id: `family-${row.id}`,
        kind: "familyDate",
        title: row.itemName,
        subtitle: subtitle || null,
        date: iso,
        startMinutes: null,
        endMinutes: null,
        href: row.href,
        overdue: false,
        hover: null,
        action: null,
      });
    }
  }

  if (params.enabledSectionIds.has(SECTION_MEDICAL)) {
    const rows = await prisma.medical_appointments.findMany({
      where: {
        household_id: params.householdId,
        is_active: true,
        appointment_date: { gte: addDays(rangeStart, -1), lte: endOfLocalDay(addDays(rangeEnd, 1)) },
      },
      include: { family_member: { select: { full_name: true } } },
      orderBy: { appointment_date: "asc" },
    });
    for (const row of rows) {
      const iso = isoDateLocal(dateOnlyLocal(row.appointment_date));
      if (!inDaySet(iso, params.visibleDays)) continue;
      events.push({
        id: `medical-${row.id}`,
        kind: "medical",
        title: row.provider_name,
        subtitle: row.family_member?.full_name ?? row.visit_description ?? null,
        date: iso,
        startMinutes: null,
        endMinutes: null,
        href: `/dashboard/medical-appointments/${row.id}`,
        overdue: false,
        hover: null,
        action: null,
      });
    }
  }

  if (params.enabledSectionIds.has(SECTION_TASKS)) {
    const rows = await prisma.tasks.findMany({
      where: {
        household_id: params.householdId,
        status: { not: "closed" },
        OR: [{ schedule_date: { not: null } }, { due_date: { not: null } }],
      },
      orderBy: { subject: "asc" },
    });
    for (const row of rows) {
      const schedule = row.schedule_date ? dateOnlyLocal(row.schedule_date) : null;
      const due = row.due_date ? dateOnlyLocal(row.due_date) : null;
      const href = `/dashboard/tasks/${row.id}/edit`;
      const sameDay = schedule && due && isoDateLocal(schedule) === isoDateLocal(due);
      if (sameDay && schedule && inDaySet(isoDateLocal(schedule), params.visibleDays)) {
        events.push({
          id: `task-${row.id}`,
          kind: "task",
          title: row.subject,
          subtitle: copy.dueTask,
          date: isoDateLocal(schedule),
          startMinutes: null,
          endMinutes: null,
          href,
          overdue: dateOnly(schedule) < today,
          hover: null,
          action: null,
        });
        continue;
      }
      if (schedule && inDaySet(isoDateLocal(schedule), params.visibleDays)) {
        events.push({
          id: `task-${row.id}-scheduled`,
          kind: "task",
          title: row.subject,
          subtitle: copy.scheduledTask,
          date: isoDateLocal(schedule),
          startMinutes: null,
          endMinutes: null,
          href,
          overdue: false,
          hover: null,
          action: null,
        });
      }
      if (due && inDaySet(isoDateLocal(due), params.visibleDays)) {
        events.push({
          id: `task-${row.id}-due`,
          kind: "task",
          title: row.subject,
          subtitle: copy.dueTask,
          date: isoDateLocal(due),
          startMinutes: null,
          endMinutes: null,
          href,
          overdue: dateOnly(due) < today,
          hover: null,
          action: null,
        });
      }
    }
  }

  if (params.enabledSectionIds.has(SECTION_RENEWALS)) {
    const rows = await computeUpcomingRenewals({
      householdId: params.householdId,
      language: params.language,
      window: { start: rangeStart, end: rangeEnd },
    });
    for (const row of calendarRenewalRows(rows, rangeStart, rangeEnd)) {
      const iso = isoDateLocal(row.renewalDate);
      if (!inDaySet(iso, params.visibleDays)) continue;
      events.push({
        id: `renewal-${row.id}`,
        kind: "renewal",
        title: row.itemName,
        subtitle: row.category,
        date: iso,
        startMinutes: null,
        endMinutes: null,
        href: row.href,
        overdue: dateOnly(row.renewalDate) < today,
        hover: null,
        action: null,
      });
    }
  }

  const kindOrder: CalendarEventKind[] = [
    "clinicAppointment",
    "clinicVisit",
    "familyDate",
    "medical",
    "task",
    "renewal",
  ];
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const aTimed = a.startMinutes == null ? 1 : 0;
    const bTimed = b.startMinutes == null ? 1 : 0;
    if (aTimed !== bTimed) return aTimed - bTimed;
    const aMin = a.startMinutes ?? 0;
    const bMin = b.startMinutes ?? 0;
    if (aMin !== bMin) return aMin - bMin;
    const ak = kindOrder.indexOf(a.kind);
    const bk = kindOrder.indexOf(b.kind);
    if (ak !== bk) return ak - bk;
    return a.title.localeCompare(b.title);
  });

  return events.map((event) => maskTitle(params.obfuscate, event));
}

async function loadClinicEvents(params: {
  householdId: string;
  familyMemberId: string | null;
  visibleDays: readonly Date[];
  today: Date;
  rangeStart: Date;
  rangeEnd: Date;
  language: UiLanguage;
  dateDisplayFormat: HouseholdDateDisplayFormat;
  lastVisitLabel: (date: string) => string;
  noLastVisit: string;
  estimatedLabel: string;
}): Promise<CalendarEvent[]> {
  const jobScope = jobWherePrivateClinicScoped(params.familyMemberId);
  const clientWhere = therapyClientsWhereLinkedPrivateClinicJobs(params.familyMemberId);
  const displayTo = endOfLocalDay(params.rangeEnd);
  const suppressionTo = endOfLocalDay(
    params.rangeEnd > addMonths(params.today, 6) ? params.rangeEnd : addMonths(params.today, 6),
  );

  const [displayAppointments, suppressionAppointments, clients] = await Promise.all([
    getUpcomingAppointmentsForHousehold({
      householdId: params.householdId,
      jobWhere: jobScope,
      fromDate: params.rangeStart,
      toDate: displayTo,
    }),
    getUpcomingAppointmentsForHousehold({
      householdId: params.householdId,
      jobWhere: jobScope,
      fromDate: params.today,
      toDate: suppressionTo,
    }),
    prisma.therapy_clients.findMany({
      where: {
        household_id: params.householdId,
        is_active: true,
        ...clientWhere,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        on_hold: true,
        start_date: true,
        visits_per_period_count: true,
        visits_per_period_weeks: true,
        default_job_id: true,
        default_program_id: true,
        default_visit_type: true,
        default_session_length_minutes: true,
        default_program: { select: { default_session_length_minutes: true } },
        default_job: { select: { default_session_length_minutes: true } },
      },
    }),
  ]);

  const events: CalendarEvent[] = [];
  const visibleIsos = new Set(params.visibleDays.map((d) => isoDateLocal(d)));

  for (const row of displayAppointments) {
    if (row.status !== "scheduled") continue;
    const placed = israelPlacement(row.startAt, row.durationMinutes);
    if (!visibleIsos.has(placed.date)) continue;
    const name = [row.client?.first_name, row.client?.last_name].filter(Boolean).join(" ") || row.clientId;
    const time = formatClock(placed.startMinutes);
    const visitLabel = therapyVisitTypeLabel(params.language, row.visitType);
    const isVirtual = row.kind === "virtual" || !row.id;
    events.push({
      id: row.id ? `appt-${row.id}` : `appt-series-${row.seriesId}-${row.occurrenceDate}`,
      kind: "clinicAppointment",
      title: name,
      subtitle: `${time} · ${visitLabel}`,
      date: placed.date,
      startMinutes: placed.startMinutes,
      endMinutes: placed.endMinutes,
      href: row.id ? `/dashboard/private-clinic/appointments/${row.id}/edit` : null,
      overdue: false,
      hover: row.note,
      action: isVirtual
        ? {
            kind: "appointment",
            rescheduleHref: null,
            reportHref: null,
            seriesId: row.seriesId,
            occurrenceDate: row.occurrenceDate,
          }
        : {
            kind: "appointment",
            rescheduleHref: appointmentRescheduleHref(row.id!),
            reportHref: appointmentReportHref(row.clientId, row.id!),
            seriesId: null,
            occurrenceDate: null,
          },
    });
  }

  const nextByClient = nextScheduledAppointmentByClientId(suppressionAppointments, params.today);
  const clientIds = clients.map((c) => c.id);
  const lastRows =
    clientIds.length > 0
      ? await prisma.therapy_treatments.groupBy({
          by: ["client_id"],
          where: { household_id: params.householdId, client_id: { in: clientIds } },
          _max: { occurred_at: true },
        })
      : [];
  const lastByClient = new Map(lastRows.map((row) => [row.client_id, row._max.occurred_at]));

  const candidates = clients.map((client) => {
    const next = nextByClient.get(client.id);
    const hasUpcomingAppointment = Boolean(next && next.startAt >= params.today);
    const count = client.visits_per_period_count;
    const weeks = client.visits_per_period_weeks;
    let cadenceDue: Date | null = null;
    if (!client.on_hold && count != null && weeks != null) {
      const lastAt = lastByClient.get(client.id) ?? null;
      if (lastAt) {
        cadenceDue = nextVisitDueDateAfterLastTreatment(lastAt, count, weeks);
      } else if (client.start_date) {
        cadenceDue = dateOnlyLocal(client.start_date);
      }
    }
    return {
      clientId: client.id,
      onHold: client.on_hold,
      cadenceDue,
      hasUpcomingAppointment,
    };
  });

  const pins = selectUnscheduledVisits(candidates, params.today);
  const visiblePins = pinsInVisibleRange(pins, params.visibleDays);
  const stripPins = overdueVisitsForStrip(pins, params.visibleDays, params.today);
  const pinIds = new Set<string>();
  const clientById = new Map(clients.map((c) => [c.id, c]));

  for (const pin of [...visiblePins, ...stripPins]) {
    if (pinIds.has(pin.clientId)) continue;
    pinIds.add(pin.clientId);
    const client = clientById.get(pin.clientId);
    if (!client) continue;
    const name = [client.first_name, client.last_name].filter(Boolean).join(" ") || client.first_name;
    const lastAt = lastByClient.get(client.id) ?? null;
    const lastLabel = lastAt
      ? params.lastVisitLabel(formatHouseholdDate(lastAt, params.dateDisplayFormat))
      : params.noLastVisit;
    const dueLabel = formatIsoDateStringForHousehold(isoDateLocal(pin.due), params.dateDisplayFormat);
    const duration =
      client.default_session_length_minutes ??
      client.default_program?.default_session_length_minutes ??
      client.default_job?.default_session_length_minutes ??
      null;
    events.push({
      id: `visit-${client.id}`,
      kind: "clinicVisit",
      title: name,
      subtitle: `${params.estimatedLabel} · ${dueLabel}`,
      date: isoDateLocal(pin.due),
      startMinutes: null,
      endMinutes: null,
      href: null,
      overdue: pin.overdue,
      hover: lastLabel,
      action: {
        kind: "visit",
        scheduleHref: scheduleAppointmentHref({
          clientId: client.id,
          jobId: client.default_job_id,
          programId: client.default_program_id,
          visitType: client.default_visit_type,
          startDate: pin.due,
          durationMinutes: duration,
          today: params.today,
          overdue: pin.overdue,
        }),
        logTreatmentHref: visitLogTreatmentHref(client.id),
      },
    });
  }

  return events;
}
