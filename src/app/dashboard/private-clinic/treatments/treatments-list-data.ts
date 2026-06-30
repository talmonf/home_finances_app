import { prisma } from "@/lib/auth";
import {
  addAmountToTotalsByCurrency,
  sortAmountTotalsByCurrency,
  type AmountTotalsByCurrency,
} from "@/lib/private-clinic/list-amount-totals";
import { decimalToNumber, treatmentPaymentStatus, type TherapyPaymentStatus } from "@/lib/therapy/payment";
import {
  formatPrivateClinicJobLabel,
  jobWherePrivateClinicScoped,
} from "@/lib/private-clinic/jobs-scope";
import type { TherapyVisitType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { therapyVisitTypesOrdered } from "@/lib/therapy/visit-type-defaults";

export type TreatmentsSortKey = "occurred_at" | "client" | "job" | "amount";
export type TreatmentsSortDir = "asc" | "desc";
export type TreatmentsPaidFilter = "all" | "paid" | "partial" | "unpaid";
export type TreatmentsReportedFilter = "all" | "reported" | "not_reported";

export type TreatmentsListFilters = {
  paid: TreatmentsPaidFilter;
  reported: TreatmentsReportedFilter;
  job: string;
  programs: string[];
  visitTypes: TherapyVisitType[];
  client: string;
  family: string;
  receipt: string;
  from: string;
  to: string;
  sort: TreatmentsSortKey;
  dir: TreatmentsSortDir;
};

export type TreatmentListRowDto = {
  id: string;
  occurred_at_iso: string;
  client_id: string;
  client_first_name: string;
  client_last_name: string | null;
  job_label: string;
  program_label: string | null;
  visit_type: TherapyVisitType;
  family_name: string | null;
  amount: string | null;
  currency: string;
  payment_status: TherapyPaymentStatus;
  job_external_reporting_system: string | null;
  has_external_reporting_system: boolean;
  reported_to_external_system: boolean;
  payment_date_iso: string | null;
  payment_method: "bank_transfer" | "digital_payment" | null;
  payment_bank_account_label: string | null;
  payment_digital_method_name: string | null;
  receipt_allocations: { id: string; receipt_id: string; receipt_number: string }[];
  linked_transaction_id: string | null;
};

export type TreatmentsCursorPage = {
  rows: TreatmentListRowDto[];
  nextCursor: string | null;
};

export function parseTreatmentsSortKey(raw: string | undefined): TreatmentsSortKey {
  if (raw === "client" || raw === "job" || raw === "amount") return raw;
  return "occurred_at";
}

export function parseTreatmentsSortDir(raw: string | undefined): TreatmentsSortDir {
  return raw === "asc" ? "asc" : "desc";
}

export function parseTreatmentsPaidFilter(raw: string | undefined): TreatmentsPaidFilter {
  if (raw === "paid" || raw === "partial" || raw === "unpaid") return raw;
  return "all";
}

export function parseTreatmentsReportedFilter(raw: string | undefined): TreatmentsReportedFilter {
  if (raw === "reported" || raw === "not_reported") return raw;
  return "all";
}

function parseSearchParamList(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  const raw = Array.isArray(value) ? value : [value];
  return [...new Set(raw.map((v) => v.trim()).filter(Boolean))];
}

export function parseTreatmentsProgramsFilter(raw: string | string[] | undefined): string[] {
  return parseSearchParamList(raw);
}

export function parseTreatmentsVisitTypesFilter(raw: string | string[] | undefined): TherapyVisitType[] {
  const valid = new Set<TherapyVisitType>(therapyVisitTypesOrdered());
  return parseSearchParamList(raw).filter((value): value is TherapyVisitType =>
    valid.has(value as TherapyVisitType),
  );
}

function treatmentsListWhereInput(params: {
  householdId: string;
  familyMemberId?: string | null;
  filters: TreatmentsListFilters;
  from: Date | null;
  to: Date | null;
}): Prisma.therapy_treatmentsWhereInput {
  const { householdId, familyMemberId, filters, from, to } = params;
  return {
    household_id: householdId,
    job: jobWherePrivateClinicScoped(familyMemberId),
    ...(filters.job ? { job_id: filters.job } : {}),
    ...(filters.programs.length ? { program_id: { in: filters.programs } } : {}),
    ...(filters.visitTypes.length ? { visit_type: { in: filters.visitTypes } } : {}),
    ...(filters.client ? { client_id: filters.client } : {}),
    ...(filters.family ? { family_id: filters.family } : {}),
    ...(filters.receipt
      ? {
          receipt_allocations: {
            some: {
              receipt_id: filters.receipt,
            },
          },
        }
      : {}),
    ...(from || to
      ? {
          occurred_at: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(filters.reported === "all"
      ? {}
      : {
          job: { ...jobWherePrivateClinicScoped(familyMemberId), external_reporting_system: { not: null } },
          reported_to_external_system: filters.reported === "reported",
        }),
  };
}

function parseDateFilter(raw: string): Date | null {
  const text = raw.trim();
  if (!text) return null;
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function orderByForTreatments(
  sort: TreatmentsSortKey,
  dir: TreatmentsSortDir,
): Prisma.therapy_treatmentsOrderByWithRelationInput[] {
  if (sort === "client") return [{ client: { first_name: dir } }, { occurred_at: "desc" }, { id: "desc" }];
  if (sort === "job") return [{ job: { job_title: dir } }, { occurred_at: "desc" }, { id: "desc" }];
  if (sort === "amount") return [{ amount: dir }, { occurred_at: "desc" }, { id: "desc" }];
  return [{ occurred_at: dir }, { id: dir }];
}

export async function loadTreatmentsCursorPage(params: {
  householdId: string;
  /** When set, only treatments whose job belongs to this family member are listed. */
  familyMemberId?: string | null;
  filters: TreatmentsListFilters;
  take: number;
  cursorId?: string;
}): Promise<TreatmentsCursorPage> {
  const { householdId, familyMemberId, filters, take, cursorId } = params;
  const from = parseDateFilter(filters.from);
  const to = parseDateFilter(filters.to);

  const baseWhere = treatmentsListWhereInput({ householdId, familyMemberId, filters, from, to });

  // Paid filtering depends on aggregated allocation amounts, so we over-fetch and then slice.
  const maxIterations = 6;
  const chunkSize = Math.max(take * 2, 40);
  const out: TreatmentListRowDto[] = [];
  let nextCursor: string | null = cursorId ?? null;
  let iterations = 0;

  while (out.length < take && iterations < maxIterations) {
    const chunk = await prisma.therapy_treatments.findMany({
      where: baseWhere,
      orderBy: orderByForTreatments(filters.sort, filters.dir),
      ...(nextCursor ? { cursor: { id: nextCursor }, skip: 1 } : {}),
      take: chunkSize,
      include: {
        client: true,
        job: true,
        program: { select: { name: true } },
        family: { select: { name: true } },
        payment_bank_account: { select: { account_name: true, bank_name: true } },
        payment_digital_payment_method: { select: { name: true } },
        receipt_allocations: {
          orderBy: { created_at: "asc" },
          include: { receipt: { select: { id: true, receipt_number: true } } },
        },
      },
    });
    iterations += 1;
    if (chunk.length === 0) {
      nextCursor = null;
      break;
    }

    nextCursor = chunk[chunk.length - 1]?.id ?? null;

    for (const t of chunk) {
      const allocated = t.receipt_allocations.reduce((sum, a) => sum + decimalToNumber(a.amount), 0);
      const paymentStatus = treatmentPaymentStatus(t.amount, allocated);
      if (filters.paid !== "all" && paymentStatus !== filters.paid) continue;
      out.push({
        id: t.id,
        occurred_at_iso: t.occurred_at.toISOString(),
        client_id: t.client_id,
        client_first_name: t.client.first_name,
        client_last_name: t.client.last_name,
        job_label: formatPrivateClinicJobLabel(t.job),
        program_label: t.program?.name ?? null,
        visit_type: t.visit_type,
        family_name: t.family?.name ?? null,
        amount: t.amount != null ? t.amount.toString() : null,
        currency: t.currency,
        payment_status: paymentStatus,
        job_external_reporting_system: t.job.external_reporting_system,
        has_external_reporting_system: Boolean(t.job.external_reporting_system),
        reported_to_external_system: t.reported_to_external_system,
        payment_date_iso: t.payment_date ? t.payment_date.toISOString() : null,
        payment_method: t.payment_method,
        payment_bank_account_label: t.payment_bank_account
          ? `${t.payment_bank_account.account_name} (${t.payment_bank_account.bank_name})`
          : null,
        payment_digital_method_name: t.payment_digital_payment_method?.name ?? null,
        receipt_allocations: t.receipt_allocations.map((a) => ({
          id: a.id,
          receipt_id: a.receipt.id,
          receipt_number: a.receipt.receipt_number,
        })),
        linked_transaction_id: t.linked_transaction_id,
      });
      if (out.length >= take) break;
    }

    if (chunk.length < chunkSize) {
      break;
    }
  }

  if (out.length < take) nextCursor = null;
  return { rows: out.slice(0, take), nextCursor };
}

export async function loadTreatmentsAmountTotal(params: {
  householdId: string;
  familyMemberId?: string | null;
  filters: TreatmentsListFilters;
}): Promise<AmountTotalsByCurrency> {
  const { householdId, familyMemberId, filters } = params;
  const from = parseDateFilter(filters.from);
  const to = parseDateFilter(filters.to);

  const baseWhere = treatmentsListWhereInput({ householdId, familyMemberId, filters, from, to });

  const chunkSize = 200;
  let cursorId: string | undefined;
  const totals = new Map<string, number>();

  for (;;) {
    const chunk = await prisma.therapy_treatments.findMany({
      where: baseWhere,
      orderBy: [{ occurred_at: "desc" }, { id: "desc" }],
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      take: chunkSize,
      select: {
        id: true,
        amount: true,
        currency: true,
        receipt_allocations: { select: { amount: true } },
      },
    });
    if (chunk.length === 0) break;

    for (const t of chunk) {
      const allocated = t.receipt_allocations.reduce((sum, a) => sum + decimalToNumber(a.amount), 0);
      const paymentStatus = treatmentPaymentStatus(t.amount, allocated);
      if (filters.paid !== "all" && paymentStatus !== filters.paid) continue;
      if (t.amount != null) addAmountToTotalsByCurrency(totals, decimalToNumber(t.amount), t.currency);
    }

    if (chunk.length < chunkSize) break;
    cursorId = chunk[chunk.length - 1]?.id;
  }

  return sortAmountTotalsByCurrency(totals);
}

export async function loadTreatmentsListRecordCount(params: {
  householdId: string;
  familyMemberId?: string | null;
  filters: TreatmentsListFilters;
}): Promise<number> {
  const { householdId, familyMemberId, filters } = params;
  const from = parseDateFilter(filters.from);
  const to = parseDateFilter(filters.to);

  const baseWhere = treatmentsListWhereInput({ householdId, familyMemberId, filters, from, to });

  if (filters.paid === "all") {
    return prisma.therapy_treatments.count({ where: baseWhere });
  }

  const chunkSize = 200;
  let cursorId: string | undefined;
  let count = 0;

  for (;;) {
    const chunk = await prisma.therapy_treatments.findMany({
      where: baseWhere,
      orderBy: [{ occurred_at: "desc" }, { id: "desc" }],
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      take: chunkSize,
      select: {
        id: true,
        amount: true,
        receipt_allocations: { select: { amount: true } },
      },
    });
    if (chunk.length === 0) break;

    for (const t of chunk) {
      const allocated = t.receipt_allocations.reduce((sum, a) => sum + decimalToNumber(a.amount), 0);
      const paymentStatus = treatmentPaymentStatus(t.amount, allocated);
      if (paymentStatus === filters.paid) count += 1;
    }

    if (chunk.length < chunkSize) break;
    cursorId = chunk[chunk.length - 1]?.id;
  }

  return count;
}
