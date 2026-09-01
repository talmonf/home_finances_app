import { prisma } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import {
  addAmountToTotalsByCurrency,
  normalizeListAmountCurrency,
  sortAmountTotalsByCurrency,
  type AmountTotalsByCurrency,
} from "@/lib/private-clinic/list-amount-totals";
import {
  formatPrivateClinicJobLabel,
  jobWherePrivateClinicScoped,
  therapyClientsWhereForJob,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";
import { decimalToNumber } from "@/lib/therapy/payment";
import { therapyVisitTypesOrdered } from "@/lib/therapy/visit-type-defaults";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import type { UiLanguage } from "@/lib/ui-language";
import type { TherapyVisitType } from "@/generated/prisma/enums";
import {
  clientOverlapsMonth,
  formatDashboardMonthLabel,
  inclusiveUtcDaySpan,
  pickChartCurrency,
  utcMonthKey,
  utcMonthKeys,
} from "@/lib/private-clinic/clinic-dashboard-range";

export const CLINIC_DASHBOARD_NO_PROGRAM_ID = "__none__";
export {
  formatDashboardMonthLabel,
  parseDashboardProgramsFilter,
  resolveDashboardDateRange,
} from "@/lib/private-clinic/clinic-dashboard-range";

export type ClinicDashboardBucket = {
  key: string;
  label: string;
  values: Record<string, number>;
};

export type ClinicDashboardSeries = {
  id: string;
  label: string;
};

export type ClinicDashboardResult = {
  fromYmd: string;
  toYmd: string;
  lineCount: number;
  totalsByCurrency: AmountTotalsByCurrency;
  chartCurrency: string | null;
  otherCurrenciesOmitted: boolean;
  stackBy: "job" | "program";
  monthKeys: string[];
  incomeByMonth: ClinicDashboardBucket[];
  stackSeries: ClinicDashboardSeries[];
  byJob: Array<{ id: string; label: string; total: number }>;
  byProgram: Array<{ id: string; label: string; total: number }>;
  activeClientsByMonth: Array<{ key: string; label: string; count: number }>;
  latestMonthActiveClients: number;
  latestMonthKey: string | null;
  visitsByMonth: ClinicDashboardBucket[];
  visitTypeSeries: ClinicDashboardSeries[];
  perClient: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    visits: number;
    daysInService: number;
  }>;
};

function consultationLineAmount(row: { amount: unknown; income_amount: unknown }): number {
  const a = decimalToNumber(row.amount);
  if (a !== 0) return a;
  return decimalToNumber(row.income_amount);
}

type IncomeLine = {
  occurredAt: Date;
  amount: number;
  currency: string;
  jobId: string;
  jobLabel: string;
  programId: string | null;
  programLabel: string | null;
};

function addToMap(map: Map<string, number>, key: string, amount: number): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

export async function loadClinicDashboardData(params: {
  householdId: string;
  familyMemberId: string | null;
  jobId: string;
  programIds: string[];
  rangeStart: Date;
  rangeEndExclusive: Date;
  fromYmd: string;
  toYmd: string;
  noProgramLabel: string;
  uiLanguage: UiLanguage;
}): Promise<ClinicDashboardResult> {
  const {
    householdId,
    familyMemberId,
    jobId,
    programIds,
    rangeStart,
    rangeEndExclusive,
    fromYmd,
    toYmd,
    noProgramLabel,
    uiLanguage,
  } = params;

  const jobScope = jobWherePrivateClinicScoped(familyMemberId);
  const occurredAtRange = { gte: rangeStart, lt: rangeEndExclusive };
  const rangeLastDay = new Date(rangeEndExclusive.getTime() - 24 * 60 * 60 * 1000);

  const treatmentWhere: Prisma.therapy_treatmentsWhereInput = {
    household_id: householdId,
    job: jobScope,
    occurred_at: occurredAtRange,
    ...(jobId ? { job_id: jobId } : {}),
    ...(programIds.length ? { program_id: { in: programIds } } : {}),
  };

  const consultationWhere: Prisma.therapy_consultationsWhereInput = {
    household_id: householdId,
    job: jobScope,
    occurred_at: occurredAtRange,
    ...(jobId ? { job_id: jobId } : {}),
    ...(programIds.length ? { program_id: { in: programIds } } : {}),
  };

  const travelAnd: Prisma.therapy_travel_entriesWhereInput[] = [
    {
      OR: [{ job: jobScope }, { treatment: { job: jobScope } }, { consultation: { job: jobScope } }],
    },
  ];
  if (jobId) {
    travelAnd.push({
      OR: [{ job_id: jobId }, { treatment: { job_id: jobId } }, { consultation: { job_id: jobId } }],
    });
  }
  if (programIds.length) {
    travelAnd.push({
      OR: [
        { treatment: { program_id: { in: programIds } } },
        { consultation: { program_id: { in: programIds } } },
      ],
    });
  }

  const travelWhere: Prisma.therapy_travel_entriesWhereInput = {
    household_id: householdId,
    occurred_at: occurredAtRange,
    AND: travelAnd,
  };

  const clientWhere: Prisma.therapy_clientsWhereInput = {
    household_id: householdId,
    ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
    ...(jobId ? therapyClientsWhereForJob(jobId) : {}),
    ...(programIds.length ? { default_program_id: { in: programIds } } : {}),
    AND: [
      { OR: [{ start_date: null }, { start_date: { lte: rangeLastDay } }] },
      { OR: [{ end_date: null }, { end_date: { gte: rangeStart } }] },
    ],
  };

  const [treatments, consultations, travelRows, clients] = await Promise.all([
    prisma.therapy_treatments.findMany({
      where: treatmentWhere,
      select: {
        occurred_at: true,
        amount: true,
        currency: true,
        job_id: true,
        program_id: true,
        visit_type: true,
        client_id: true,
        job: { select: { job_title: true, employer_name: true } },
        program: { select: { name: true } },
        client: { select: { first_name: true, last_name: true } },
      },
    }),
    prisma.therapy_consultations.findMany({
      where: consultationWhere,
      select: {
        occurred_at: true,
        amount: true,
        income_amount: true,
        currency: true,
        job_id: true,
        program_id: true,
        job: { select: { job_title: true, employer_name: true } },
        program: { select: { name: true } },
      },
    }),
    prisma.therapy_travel_entries.findMany({
      where: travelWhere,
      select: {
        occurred_at: true,
        amount: true,
        currency: true,
        job_id: true,
        job: { select: { job_title: true, employer_name: true } },
        treatment: {
          select: {
            job_id: true,
            program_id: true,
            job: { select: { job_title: true, employer_name: true } },
            program: { select: { name: true } },
          },
        },
        consultation: {
          select: {
            job_id: true,
            program_id: true,
            job: { select: { job_title: true, employer_name: true } },
            program: { select: { name: true } },
          },
        },
      },
    }),
    prisma.therapy_clients.findMany({
      where: clientWhere,
      select: { id: true, start_date: true, end_date: true },
    }),
  ]);

  const lines: IncomeLine[] = [];

  for (const t of treatments) {
    lines.push({
      occurredAt: t.occurred_at,
      amount: decimalToNumber(t.amount),
      currency: t.currency,
      jobId: t.job_id,
      jobLabel: formatPrivateClinicJobLabel(t.job),
      programId: t.program_id,
      programLabel: t.program?.name ?? null,
    });
  }

  for (const c of consultations) {
    lines.push({
      occurredAt: c.occurred_at,
      amount: consultationLineAmount(c),
      currency: c.currency,
      jobId: c.job_id,
      jobLabel: formatPrivateClinicJobLabel(c.job),
      programId: c.program_id,
      programLabel: c.program?.name ?? null,
    });
  }

  for (const tr of travelRows) {
    if (!tr.occurred_at) continue;
    const job =
      tr.job ??
      tr.treatment?.job ??
      tr.consultation?.job ??
      null;
    const resolvedJobId = tr.job_id ?? tr.treatment?.job_id ?? tr.consultation?.job_id ?? "";
    if (!resolvedJobId || !job) continue;
    const programId = tr.treatment?.program_id ?? tr.consultation?.program_id ?? null;
    const programLabel = tr.treatment?.program?.name ?? tr.consultation?.program?.name ?? null;
    lines.push({
      occurredAt: tr.occurred_at,
      amount: decimalToNumber(tr.amount),
      currency: tr.currency,
      jobId: resolvedJobId,
      jobLabel: formatPrivateClinicJobLabel(job),
      programId,
      programLabel,
    });
  }

  const totalsMap = new Map<string, number>();
  for (const line of lines) {
    addAmountToTotalsByCurrency(totalsMap, line.amount, line.currency);
  }
  const totalsByCurrency = sortAmountTotalsByCurrency(totalsMap);
  const chartCurrency = pickChartCurrency(totalsByCurrency);
  const otherCurrenciesOmitted =
    Boolean(chartCurrency) && totalsByCurrency.some((t) => t.currency !== chartCurrency && t.total !== 0);

  const chartLines = chartCurrency
    ? lines.filter((l) => normalizeListAmountCurrency(l.currency) === chartCurrency)
    : [];

  const uniqueJobIds = new Set(chartLines.map((l) => l.jobId));
  const stackBy: "job" | "program" = jobId || uniqueJobIds.size <= 1 ? "program" : "job";

  const monthKeys = utcMonthKeys(rangeStart, rangeEndExclusive);
  const jobLabels = new Map<string, string>();
  const programLabels = new Map<string, string>();
  programLabels.set(CLINIC_DASHBOARD_NO_PROGRAM_ID, noProgramLabel);

  const byJobMap = new Map<string, number>();
  const byProgramMap = new Map<string, number>();
  const monthJob = new Map<string, Map<string, number>>();
  const monthProgram = new Map<string, Map<string, number>>();

  for (const key of monthKeys) {
    monthJob.set(key, new Map());
    monthProgram.set(key, new Map());
  }

  for (const line of chartLines) {
    const key = utcMonthKey(line.occurredAt);
    jobLabels.set(line.jobId, line.jobLabel);
    const programKey = line.programId ?? CLINIC_DASHBOARD_NO_PROGRAM_ID;
    if (line.programId) programLabels.set(line.programId, line.programLabel ?? noProgramLabel);

    addToMap(byJobMap, line.jobId, line.amount);
    addToMap(byProgramMap, programKey, line.amount);

    const jobMonth = monthJob.get(key);
    const programMonth = monthProgram.get(key);
    if (jobMonth) addToMap(jobMonth, line.jobId, line.amount);
    if (programMonth) addToMap(programMonth, programKey, line.amount);
  }

  const stackSeries: ClinicDashboardSeries[] =
    stackBy === "job"
      ? [...jobLabels.entries()]
          .sort((a, b) => a[1].localeCompare(b[1], uiLanguage === "he" ? "he" : "en"))
          .map(([id, label]) => ({ id, label }))
      : [...programLabels.entries()]
          .filter(([id]) => byProgramMap.has(id) || id === CLINIC_DASHBOARD_NO_PROGRAM_ID)
          .sort((a, b) => {
            if (a[0] === CLINIC_DASHBOARD_NO_PROGRAM_ID) return 1;
            if (b[0] === CLINIC_DASHBOARD_NO_PROGRAM_ID) return -1;
            return a[1].localeCompare(b[1], uiLanguage === "he" ? "he" : "en");
          })
          .filter(([id]) => (monthKeys.some((k) => (monthProgram.get(k)?.get(id) ?? 0) !== 0) || byProgramMap.has(id)))
          .map(([id, label]) => ({ id, label }));

  const seriesForStack =
    stackBy === "program"
      ? stackSeries.filter((s) => monthKeys.some((k) => (monthProgram.get(k)?.get(s.id) ?? 0) !== 0))
      : stackSeries;

  const incomeByMonth: ClinicDashboardBucket[] = monthKeys.map((key) => {
    const source = stackBy === "job" ? monthJob.get(key) : monthProgram.get(key);
    const values: Record<string, number> = {};
    for (const s of seriesForStack) {
      values[s.id] = source?.get(s.id) ?? 0;
    }
    return { key, label: formatDashboardMonthLabel(key, uiLanguage), values };
  });

  const byJob = [...byJobMap.entries()]
    .map(([id, total]) => ({ id, label: jobLabels.get(id) ?? id, total }))
    .sort((a, b) => b.total - a.total);

  const byProgram = [...byProgramMap.entries()]
    .map(([id, total]) => ({
      id,
      label: programLabels.get(id) ?? (id === CLINIC_DASHBOARD_NO_PROGRAM_ID ? noProgramLabel : id),
      total,
    }))
    .sort((a, b) => {
      if (a.id === CLINIC_DASHBOARD_NO_PROGRAM_ID) return 1;
      if (b.id === CLINIC_DASHBOARD_NO_PROGRAM_ID) return -1;
      return b.total - a.total;
    });

  const activeClientsByMonth = monthKeys.map((key) => ({
    key,
    label: formatDashboardMonthLabel(key, uiLanguage),
    count: clients.filter((c) => clientOverlapsMonth(c.start_date, c.end_date, key)).length,
  }));

  const latestMonthKey = monthKeys.length ? monthKeys[monthKeys.length - 1]! : null;
  const latestMonthActiveClients = latestMonthKey
    ? (activeClientsByMonth.find((r) => r.key === latestMonthKey)?.count ?? 0)
    : 0;

  const visitTypeOrder = therapyVisitTypesOrdered();
  const monthVisit = new Map<string, Map<string, number>>();
  for (const key of monthKeys) monthVisit.set(key, new Map());
  const visitTypeCounts = new Map<TherapyVisitType, number>();
  const perClientMap = new Map<
    string,
    { firstName: string; lastName: string | null; visits: number; firstAt: Date; lastAt: Date }
  >();

  for (const t of treatments) {
    const key = utcMonthKey(t.occurred_at);
    const visitMonth = monthVisit.get(key);
    if (visitMonth) addToMap(visitMonth, t.visit_type, 1);
    visitTypeCounts.set(t.visit_type, (visitTypeCounts.get(t.visit_type) ?? 0) + 1);

    const existing = perClientMap.get(t.client_id);
    if (!existing) {
      perClientMap.set(t.client_id, {
        firstName: t.client.first_name,
        lastName: t.client.last_name,
        visits: 1,
        firstAt: t.occurred_at,
        lastAt: t.occurred_at,
      });
    } else {
      existing.visits += 1;
      if (t.occurred_at < existing.firstAt) existing.firstAt = t.occurred_at;
      if (t.occurred_at > existing.lastAt) existing.lastAt = t.occurred_at;
    }
  }

  const visitTypeSeries: ClinicDashboardSeries[] = visitTypeOrder
    .filter((vt) => (visitTypeCounts.get(vt) ?? 0) > 0)
    .map((vt) => ({ id: vt, label: therapyVisitTypeLabel(uiLanguage, vt) }));

  const visitsByMonth: ClinicDashboardBucket[] = monthKeys.map((key) => {
    const source = monthVisit.get(key);
    const values: Record<string, number> = {};
    for (const s of visitTypeSeries) {
      values[s.id] = source?.get(s.id) ?? 0;
    }
    return { key, label: formatDashboardMonthLabel(key, uiLanguage), values };
  });

  const locale = uiLanguage === "he" ? "he" : "en";
  const perClient = [...perClientMap.entries()]
    .map(([id, row]) => ({
      id,
      firstName: row.firstName,
      lastName: row.lastName,
      visits: row.visits,
      daysInService: inclusiveUtcDaySpan(row.firstAt, row.lastAt),
    }))
    .sort((a, b) => {
      if (b.visits !== a.visits) return b.visits - a.visits;
      const nameA = `${a.firstName} ${a.lastName ?? ""}`.trim();
      const nameB = `${b.firstName} ${b.lastName ?? ""}`.trim();
      return nameA.localeCompare(nameB, locale);
    });

  return {
    fromYmd,
    toYmd,
    lineCount: lines.length,
    totalsByCurrency,
    chartCurrency,
    otherCurrenciesOmitted,
    stackBy,
    monthKeys,
    incomeByMonth,
    stackSeries: seriesForStack,
    byJob,
    byProgram,
    activeClientsByMonth,
    latestMonthActiveClients,
    latestMonthKey,
    visitsByMonth,
    visitTypeSeries,
    perClient,
  };
}
