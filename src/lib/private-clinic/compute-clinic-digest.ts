import { prisma } from "@/lib/auth";
import { endOfDaysAheadWindow } from "@/lib/digest-email/schedule";
import { formatJobDisplayLabel } from "@/lib/job-label";
import {
  jobWherePrivateClinicScoped,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";
import { dateOnlyLocal, startOfTodayLocal } from "@/lib/private-clinic/reminders-logic";
import { nextVisitDueDateAfterLastTreatment } from "@/lib/therapy/visit-frequency";
import type { TherapyVisitType } from "@/generated/prisma/client";

export type ClinicDigestAppointmentRow = {
  id: string;
  startAt: Date;
  clientName: string;
  jobLabel: string;
  visitType: TherapyVisitType;
};

export type ClinicDigestVisitRow = {
  clientId: string;
  name: string;
  jobLabel: string;
  programLabel: string;
  kupatHolimLabel: string;
  familyName: string | null;
  lastVisit: Date | null;
  nextDue: Date;
  isOverdue: boolean;
  isDueToday: boolean;
  nextAppointment: { id: string | null; startAt: Date } | null;
};

export type ClinicDigestNeedsFirstVisitRow = {
  clientId: string;
  name: string;
  nextAppointment: { id: string | null; startAt: Date } | null;
};

export type ClinicDigestData = {
  appointments: ClinicDigestAppointmentRow[];
  visits: ClinicDigestVisitRow[];
  needsFirstVisit: ClinicDigestNeedsFirstVisitRow[];
};

const APPOINTMENTS_CAP = 100;

function clientDisplayName(firstName: string, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ") || firstName;
}

function kupatHolimLabel(
  kupat: string | null,
  labels: { none: string; clalit: string; maccabi: string; meuhedet: string; leumit: string },
): string {
  switch (kupat) {
    case "clalit":
      return labels.clalit;
    case "maccabi":
      return labels.maccabi;
    case "meuhedet":
      return labels.meuhedet;
    case "leumit":
      return labels.leumit;
    default:
      return labels.none;
  }
}

export async function computeClinicDigestData(args: {
  householdId: string;
  familyMemberId: string | null;
  now: Date;
  daysAhead: number;
  timezone: string;
  kupatLabels: {
    none: string;
    clalit: string;
    maccabi: string;
    meuhedet: string;
    leumit: string;
  };
  noneLabel: string;
}): Promise<ClinicDigestData> {
  const { householdId, familyMemberId, now, daysAhead, timezone, kupatLabels, noneLabel } = args;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);
  const windowEnd = endOfDaysAheadWindow(now, daysAhead, timezone);

  const { getUpcomingAppointmentsForHousehold } = await import("@/lib/therapy/series-occurrences");
  const mergedUpcoming = await getUpcomingAppointmentsForHousehold({
    householdId,
    jobWhere: jobScope,
  });
  const appointments: ClinicDigestAppointmentRow[] = mergedUpcoming
    .filter((a) => a.status === "scheduled" && a.startAt >= now && a.startAt <= windowEnd)
    .slice(0, APPOINTMENTS_CAP)
    .map((a) => ({
      id: a.id ?? `series:${a.seriesId}:${a.occurrenceDate}`,
      startAt: a.startAt,
      clientName: a.client
        ? clientDisplayName(a.client.first_name, a.client.last_name)
        : "—",
      jobLabel: a.job ? formatJobDisplayLabel({ job_title: a.job.job_title, employer_name: null }) : "—",
      visitType: a.visitType,
    }));

  const clients = await prisma.therapy_clients.findMany({
    where: {
      household_id: householdId,
      is_active: true,
      visits_per_period_count: { not: null },
      visits_per_period_weeks: { not: null },
      ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
    },
    orderBy: [{ first_name: "asc" }, { last_name: "asc" }, { id: "asc" }],
    include: {
      default_job: true,
      default_program: true,
      family: true,
    },
  });

  const today = startOfTodayLocal();
  const clientIds = clients.map((x) => x.id);

  const clientUpcoming =
    clientIds.length > 0
      ? await getUpcomingAppointmentsForHousehold({
          householdId,
          clientIds,
        })
      : [];

  const nextAppointmentByClientId = new Map<string, { id: string | null; startAt: Date }>();
  for (const appointment of clientUpcoming) {
    if (appointment.status !== "scheduled") continue;
    if (!nextAppointmentByClientId.has(appointment.clientId)) {
      nextAppointmentByClientId.set(appointment.clientId, {
        id: appointment.id,
        startAt: appointment.startAt,
      });
    }
  }

  const lastTreatmentRows =
    clientIds.length > 0
      ? await prisma.therapy_treatments.groupBy({
          by: ["client_id"],
          where: {
            household_id: householdId,
            client_id: { in: clientIds },
          },
          _max: { occurred_at: true },
        })
      : [];

  const lastVisitAtByClientId = new Map(
    lastTreatmentRows.map((row) => [row.client_id, row._max.occurred_at]),
  );

  const visits: ClinicDigestVisitRow[] = [];
  const needsFirstVisit: ClinicDigestNeedsFirstVisitRow[] = [];

  for (const row of clients) {
    const vc = row.visits_per_period_count;
    const vw = row.visits_per_period_weeks;
    if (vc == null || vw == null) continue;

    const name = clientDisplayName(row.first_name, row.last_name);
    const nextAppointment = nextAppointmentByClientId.get(row.id) ?? null;
    const lastAt = lastVisitAtByClientId.get(row.id);

    if (!lastAt) {
      if (!row.start_date) {
        needsFirstVisit.push({ clientId: row.id, name, nextAppointment });
        continue;
      }

      const nextDue = dateOnlyLocal(row.start_date);
      const nextDay = dateOnlyLocal(nextDue);
      visits.push({
        clientId: row.id,
        name,
        jobLabel: formatJobDisplayLabel(row.default_job),
        programLabel: row.default_program?.name ?? noneLabel,
        kupatHolimLabel: kupatHolimLabel(row.kupat_holim, kupatLabels),
        familyName: row.family?.name ?? null,
        lastVisit: null,
        nextDue,
        isOverdue: nextDay.getTime() < today.getTime(),
        isDueToday: nextDay.getTime() === today.getTime(),
        nextAppointment,
      });
      continue;
    }

    const nextDue = nextVisitDueDateAfterLastTreatment(lastAt, vc, vw);
    const nextDay = dateOnlyLocal(nextDue);
    visits.push({
      clientId: row.id,
      name,
      jobLabel: formatJobDisplayLabel(row.default_job),
      programLabel: row.default_program?.name ?? noneLabel,
      kupatHolimLabel: kupatHolimLabel(row.kupat_holim, kupatLabels),
      familyName: row.family?.name ?? null,
      lastVisit: lastAt,
      nextDue,
      isOverdue: nextDay.getTime() < today.getTime(),
      isDueToday: nextDay.getTime() === today.getTime(),
      nextAppointment,
    });
  }

  visits.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());

  return { appointments, visits, needsFirstVisit };
}

/** Resolve family member id for digest scoping. */
export async function resolveFamilyMemberIdForUser(
  userId: string,
  householdId: string,
): Promise<string | null> {
  const user = await prisma.users.findFirst({
    where: { id: userId, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  return user?.family_member_id ?? null;
}

export function digestItemCount(data: ClinicDigestData): number {
  return data.appointments.length + data.visits.length + data.needsFirstVisit.length;
}
