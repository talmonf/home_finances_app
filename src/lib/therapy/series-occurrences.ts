import { prisma } from "@/lib/auth";
import type { TherapyAppointmentRecurrence, TherapyVisitType } from "@/generated/prisma/enums";
import { TherapyAppointmentAuditAction } from "@/generated/prisma/enums";
import {
  appointmentToSnapshot,
  logTherapyAppointmentAudit,
} from "@/lib/therapy/appointment-audit";

const APPOINTMENT_TIME_ZONE = "Asia/Jerusalem";
const DEFAULT_LIST_HORIZON_MONTHS = 6;

export type SeriesRuleInput = {
  id: string;
  household_id: string;
  client_id: string;
  job_id: string;
  program_id: string | null;
  visit_type: TherapyVisitType;
  recurrence: TherapyAppointmentRecurrence;
  day_of_week: number;
  time_of_day: Date;
  start_date: Date;
  end_date: Date | null;
  duration_minutes: number | null;
  is_active: boolean;
};

export type VirtualSeriesOccurrence = {
  kind: "virtual";
  seriesId: string;
  occurrenceDate: string;
  startAt: Date;
  clientId: string;
  jobId: string;
  programId: string | null;
  visitType: TherapyVisitType;
  durationMinutes: number | null;
};

export type UpcomingAppointmentRow = {
  kind: "instance" | "virtual";
  id: string | null;
  seriesId: string | null;
  occurrenceDate: string | null;
  startAt: Date;
  clientId: string;
  jobId: string;
  programId: string | null;
  visitType: TherapyVisitType;
  durationMinutes: number | null;
  status: "scheduled" | "completed" | "cancelled";
  treatmentId: string | null;
  client?: { first_name: string; last_name: string | null };
  job?: { job_title: string; id: string };
};

function stripTime(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function isoDateOnly(d: Date): string {
  const x = stripTime(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function combineDateWithTime(dateOnly: Date, timeOfDay: Date): Date {
  const t = new Date(timeOfDay);
  const x = new Date(dateOnly);
  x.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
  return x;
}

function firstOccurrenceOnOrAfter(start: Date, dayOfWeek: number): Date {
  const s = stripTime(start);
  const current = s.getDay();
  const diff = (dayOfWeek - current + 7) % 7;
  return addDays(s, diff);
}

export function expandSeriesOccurrences(
  series: SeriesRuleInput,
  from: Date,
  to: Date,
  skipDates: Set<string>,
): VirtualSeriesOccurrence[] {
  if (!series.is_active) return [];

  const fromDay = stripTime(from);
  const toDay = stripTime(to);
  const startBound = stripTime(new Date(series.start_date));
  const seriesEnd = series.end_date ? stripTime(new Date(series.end_date)) : null;
  const lastDate = seriesEnd != null && seriesEnd < toDay ? seriesEnd : toDay;

  if (lastDate < fromDay || lastDate < startBound) return [];

  const step = series.recurrence === "biweekly" ? 14 : 7;
  let d = firstOccurrenceOnOrAfter(startBound, series.day_of_week);

  while (stripTime(d) < startBound) {
    d = addDays(d, step);
  }
  while (stripTime(d) < fromDay) {
    d = addDays(d, step);
  }

  const results: VirtualSeriesOccurrence[] = [];
  while (stripTime(d) <= lastDate) {
    const occurrenceDate = isoDateOnly(d);
    if (!skipDates.has(occurrenceDate)) {
      results.push({
        kind: "virtual",
        seriesId: series.id,
        occurrenceDate,
        startAt: combineDateWithTime(d, series.time_of_day),
        clientId: series.client_id,
        jobId: series.job_id,
        programId: series.program_id,
        visitType: series.visit_type,
        durationMinutes: series.duration_minutes,
      });
    }
    d = addDays(d, step);
  }
  return results;
}

export function mergeAppointmentsWithSeriesExpansion(
  realRows: UpcomingAppointmentRow[],
  virtualRows: VirtualSeriesOccurrence[],
): UpcomingAppointmentRow[] {
  const realBySeriesDate = new Map<string, UpcomingAppointmentRow>();
  for (const row of realRows) {
    if (row.seriesId && row.occurrenceDate) {
      realBySeriesDate.set(`${row.seriesId}:${row.occurrenceDate}`, row);
    }
  }

  const merged: UpcomingAppointmentRow[] = [...realRows];
  for (const v of virtualRows) {
    const key = `${v.seriesId}:${v.occurrenceDate}`;
    if (realBySeriesDate.has(key)) continue;
    merged.push({
      kind: "virtual",
      id: null,
      seriesId: v.seriesId,
      occurrenceDate: v.occurrenceDate,
      startAt: v.startAt,
      clientId: v.clientId,
      jobId: v.jobId,
      programId: v.programId,
      visitType: v.visitType,
      durationMinutes: v.durationMinutes,
      status: "scheduled",
      treatmentId: null,
    });
  }

  return merged.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

const appointmentInclude = {
  client: true,
  job: true,
  program: true,
} as const;

export async function ensureAppointmentInstance(params: {
  householdId: string;
  seriesId: string;
  occurrenceDate: string;
  userId: string;
}) {
  const { householdId, seriesId, occurrenceDate, userId } = params;

  const existing = await prisma.therapy_appointments.findFirst({
    where: {
      household_id: householdId,
      series_id: seriesId,
      occurrence_date: new Date(`${occurrenceDate}T00:00:00`),
    },
    include: appointmentInclude,
  });
  if (existing) return existing;

  const series = await prisma.therapy_appointment_series.findFirst({
    where: { id: seriesId, household_id: householdId },
  });
  if (!series || !series.is_active) return null;

  const skip = await prisma.therapy_appointment_series_exceptions.findFirst({
    where: {
      series_id: seriesId,
      household_id: householdId,
      occurrence_date: new Date(`${occurrenceDate}T00:00:00`),
      kind: "skip",
    },
  });
  if (skip) return null;

  const [y, m, d] = occurrenceDate.split("-").map(Number);
  const dateOnly = new Date(y, m - 1, d);
  const startAt = combineDateWithTime(dateOnly, series.time_of_day);
  const endAt =
    series.duration_minutes && series.duration_minutes > 0
      ? new Date(startAt.getTime() + series.duration_minutes * 60 * 1000)
      : null;

  const primaryClient = await prisma.therapy_clients.findFirst({
    where: { id: series.client_id, household_id: householdId },
    select: { family_id: true },
  });

  const appointmentId = crypto.randomUUID();
  const created = await prisma.therapy_appointments.create({
    data: {
      id: appointmentId,
      household_id: householdId,
      client_id: series.client_id,
      family_id: primaryClient?.family_id ?? null,
      job_id: series.job_id,
      program_id: series.program_id,
      series_id: series.id,
      occurrence_date: new Date(`${occurrenceDate}T00:00:00`),
      visit_type: series.visit_type,
      start_at: startAt,
      end_at: endAt,
      duration_minutes: series.duration_minutes,
      status: "scheduled",
    },
    include: appointmentInclude,
  });

  await logTherapyAppointmentAudit({
    householdId,
    userId,
    appointmentId: created.id,
    action: TherapyAppointmentAuditAction.create,
    metadata: {
      snapshot: appointmentToSnapshot(created),
      reason: "series_instance_materialized",
    },
  });

  return created;
}

export async function insertSeriesSkipException(params: {
  householdId: string;
  seriesId: string;
  occurrenceDate: string;
  appointmentId?: string | null;
}) {
  const date = new Date(`${params.occurrenceDate}T00:00:00`);
  await prisma.therapy_appointment_series_exceptions.upsert({
    where: {
      series_id_occurrence_date: {
        series_id: params.seriesId,
        occurrence_date: date,
      },
    },
    create: {
      id: crypto.randomUUID(),
      household_id: params.householdId,
      series_id: params.seriesId,
      occurrence_date: date,
      kind: "skip",
      appointment_id: params.appointmentId ?? null,
    },
    update: {
      kind: "skip",
      appointment_id: params.appointmentId ?? null,
    },
  });
}

export async function getUpcomingAppointmentsForHousehold(params: {
  householdId: string;
  jobWhere?: object;
  clientIds?: string[];
  from?: Date;
  horizonMonths?: number;
  take?: number;
}): Promise<UpcomingAppointmentRow[]> {
  const now = params.from ?? new Date();
  const horizonEnd = addMonths(now, params.horizonMonths ?? DEFAULT_LIST_HORIZON_MONTHS);

  const realAppointments = await prisma.therapy_appointments.findMany({
    where: {
      household_id: params.householdId,
      ...(params.jobWhere ? { job: params.jobWhere } : {}),
      ...(params.clientIds ? { client_id: { in: params.clientIds } } : {}),
      OR: [
        { status: "scheduled", start_at: { gte: now } },
        { status: { in: ["completed", "cancelled"] }, start_at: { gte: now, lte: horizonEnd } },
      ],
    },
    include: { client: true, job: true },
    orderBy: { start_at: "asc" },
  });

  const realRows: UpcomingAppointmentRow[] = realAppointments.map((a) => ({
    kind: a.series_id ? "instance" : "instance",
    id: a.id,
    seriesId: a.series_id,
    occurrenceDate: a.occurrence_date ? isoDateOnly(new Date(a.occurrence_date)) : null,
    startAt: a.start_at,
    clientId: a.client_id,
    jobId: a.job_id,
    programId: a.program_id,
    visitType: a.visit_type,
    durationMinutes: a.duration_minutes,
    status: a.status,
    treatmentId: a.treatment_id,
    client: a.client,
    job: { job_title: a.job.job_title, id: a.job.id },
  }));

  const activeSeries = await prisma.therapy_appointment_series.findMany({
    where: {
      household_id: params.householdId,
      is_active: true,
      ...(params.clientIds ? { client_id: { in: params.clientIds } } : {}),
      ...(params.jobWhere ? { job: params.jobWhere } : {}),
    },
    include: { client: true, job: true },
  });

  const seriesIds = activeSeries.map((s) => s.id);
  const exceptions =
    seriesIds.length > 0
      ? await prisma.therapy_appointment_series_exceptions.findMany({
          where: {
            household_id: params.householdId,
            series_id: { in: seriesIds },
            kind: "skip",
          },
        })
      : [];

  const skipBySeries = new Map<string, Set<string>>();
  for (const ex of exceptions) {
    const set = skipBySeries.get(ex.series_id) ?? new Set<string>();
    set.add(isoDateOnly(new Date(ex.occurrence_date)));
    skipBySeries.set(ex.series_id, set);
  }

  const virtualRows: VirtualSeriesOccurrence[] = [];
  const virtualMeta = new Map<string, { client: { first_name: string; last_name: string | null }; job: { job_title: string; id: string } }>();
  for (const series of activeSeries) {
    const skips = skipBySeries.get(series.id) ?? new Set<string>();
    const expanded = expandSeriesOccurrences(
      {
        id: series.id,
        household_id: series.household_id,
        client_id: series.client_id,
        job_id: series.job_id,
        program_id: series.program_id,
        visit_type: series.visit_type,
        recurrence: series.recurrence,
        day_of_week: series.day_of_week,
        time_of_day: series.time_of_day,
        start_date: series.start_date,
        end_date: series.end_date,
        duration_minutes: series.duration_minutes,
        is_active: series.is_active,
      },
      now,
      horizonEnd,
      skips,
    );
    for (const row of expanded) {
      virtualMeta.set(`${row.seriesId}:${row.occurrenceDate}`, {
        client: series.client,
        job: { job_title: series.job.job_title, id: series.job.id },
      });
    }
    virtualRows.push(...expanded);
  }

  const scheduledReal = realRows.filter((r) => r.status === "scheduled" && r.startAt >= now);
  const merged = mergeAppointmentsWithSeriesExpansion(scheduledReal, virtualRows).map((row) => {
    if (row.kind === "virtual" && row.seriesId && row.occurrenceDate) {
      const meta = virtualMeta.get(`${row.seriesId}:${row.occurrenceDate}`);
      if (meta) {
        return { ...row, client: meta.client, job: meta.job };
      }
    }
    return row;
  });
  if (params.take) return merged.slice(0, params.take);
  return merged;
}

export { APPOINTMENT_TIME_ZONE, DEFAULT_LIST_HORIZON_MONTHS };
