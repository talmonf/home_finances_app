import { prisma } from "@/lib/auth";
import {
  addAmountToTotalsByCurrency,
  normalizeListAmountCurrency,
  sortAmountTotalsByCurrency,
  type AmountTotalsByCurrency,
} from "@/lib/private-clinic/list-amount-totals";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import type { Prisma } from "@/generated/prisma/client";

export type ConsultationsSortKey = "occurred_at" | "type" | "job" | "amount";
export type ConsultationsSortDir = "asc" | "desc";
export type ConsultationsReceivedFilter = "all" | "linked" | "unlinked";

export type ConsultationsListFilters = {
  job: string;
  consultation_type_id: string;
  receipt: string;
  from: string;
  to: string;
  received: ConsultationsReceivedFilter;
  sort: ConsultationsSortKey;
  dir: ConsultationsSortDir;
};

export type ConsultationListRowDto = {
  id: string;
  job_id: string;
  job_label: string;
  program_id: string | null;
  program_label: string | null;
  consultation_type_id: string;
  consultation_type_name: string;
  consultation_type_name_he: string | null;
  occurred_at_iso: string;
  amount: string | null;
  currency: string;
  linked_transaction_id: string | null;
  linked_receipt_id: string | null;
  linked_receipt_number: string | null;
  clients: Array<{ id: string; name: string; name_he: string | null }>;
  notes: string | null;
};

export type ConsultationsCursorPage = {
  rows: ConsultationListRowDto[];
  nextCursor: string | null;
};

const CONSULTATIONS_LIST_INCLUDE = {
  job: true,
  program: { select: { id: true, name: true } },
  consultation_type: true,
  receipt_allocations: {
    include: {
      receipt: {
        select: {
          id: true,
          receipt_number: true,
          client: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      },
    },
    take: 1,
    orderBy: { created_at: "desc" as const },
  },
  participants: {
    include: {
      client: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
  },
} satisfies Prisma.therapy_consultationsInclude;

type ConsultationListPrismaRow = Prisma.therapy_consultationsGetPayload<{
  include: typeof CONSULTATIONS_LIST_INCLUDE;
}>;

export function parseConsultationsSortKey(raw: string | undefined): ConsultationsSortKey {
  if (raw === "type" || raw === "job" || raw === "amount") return raw;
  return "occurred_at";
}

export function parseConsultationsSortDir(raw: string | undefined): ConsultationsSortDir {
  return raw === "asc" ? "asc" : "desc";
}

export function parseConsultationsReceivedFilter(raw: string | undefined): ConsultationsReceivedFilter {
  if (raw === "linked" || raw === "unlinked") return raw;
  return "all";
}

function parseDateFilter(raw: string): Date | null {
  const text = raw.trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function orderByForConsultations(
  sort: ConsultationsSortKey,
  dir: ConsultationsSortDir,
): Prisma.therapy_consultationsOrderByWithRelationInput[] {
  if (sort === "type") return [{ consultation_type: { sort_order: dir } }, { occurred_at: "desc" }, { id: "desc" }];
  if (sort === "job") return [{ job: { job_title: dir } }, { occurred_at: "desc" }, { id: "desc" }];
  if (sort === "amount") return [{ amount: dir }, { occurred_at: "desc" }, { id: "desc" }];
  return [{ occurred_at: dir }, { id: dir }];
}

function mapConsultationListRow(row: ConsultationListPrismaRow): ConsultationListRowDto {
  const participantClients = row.participants.map((p) => ({
    id: p.client.id,
    name: `${p.client.first_name} ${p.client.last_name ?? ""}`.trim(),
    name_he: null,
  }));
  const fallbackReceiptClient = row.receipt_allocations[0]?.receipt.client
    ? [
        {
          id: row.receipt_allocations[0].receipt.client.id,
          name:
            `${row.receipt_allocations[0].receipt.client.first_name} ${row.receipt_allocations[0].receipt.client.last_name ?? ""}`.trim(),
          name_he: null,
        },
      ]
    : [];

  const currencyRaw = row.currency ?? row.income_currency ?? row.cost_currency;
  const currency = (typeof currencyRaw === "string" ? currencyRaw.trim() : "") || "ILS";

  return {
    id: row.id,
    job_id: row.job_id,
    job_label: row.job ? formatJobDisplayLabel(row.job) : "—",
    program_id: row.program_id,
    program_label: row.program?.name ?? null,
    consultation_type_id: row.consultation_type_id,
    consultation_type_name: row.consultation_type?.name ?? "",
    consultation_type_name_he: row.consultation_type?.name_he ?? null,
    occurred_at_iso: row.occurred_at.toISOString(),
    amount: row.amount?.toString() ?? row.income_amount?.toString() ?? row.cost_amount?.toString() ?? null,
    currency,
    linked_transaction_id:
      row.linked_transaction_id ?? row.linked_income_transaction_id ?? row.linked_cost_transaction_id,
    linked_receipt_id: row.receipt_allocations[0]?.receipt_id ?? null,
    linked_receipt_number: row.receipt_allocations[0]?.receipt.receipt_number ?? null,
    clients: participantClients.length > 0 ? participantClients : fallbackReceiptClient,
    notes: row.notes,
  };
}

function whereForConsultationsList(params: {
  householdId: string;
  familyMemberId?: string | null;
  filters: ConsultationsListFilters;
}): Prisma.therapy_consultationsWhereInput {
  const { householdId, familyMemberId, filters } = params;
  const from = parseDateFilter(filters.from);
  const to = parseDateFilter(filters.to);

  return {
    household_id: householdId,
    job: jobWherePrivateClinicScoped(familyMemberId),
    ...(filters.job ? { job_id: filters.job } : {}),
    ...(filters.consultation_type_id ? { consultation_type_id: filters.consultation_type_id } : {}),
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
    ...(filters.received === "linked" ? { receipt_allocations: { some: {} } } : {}),
    ...(filters.received === "unlinked" ? { receipt_allocations: { none: {} } } : {}),
  };
}

export async function loadConsultationsCursorPage(params: {
  householdId: string;
  familyMemberId?: string | null;
  filters: ConsultationsListFilters;
  take: number;
  cursorId?: string;
}): Promise<ConsultationsCursorPage> {
  const { householdId, familyMemberId, filters, take, cursorId } = params;
  const where = whereForConsultationsList({ householdId, familyMemberId, filters });

  const chunk = await prisma.therapy_consultations.findMany({
    where,
    orderBy: orderByForConsultations(filters.sort, filters.dir),
    include: CONSULTATIONS_LIST_INCLUDE,
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    take,
  });

  const rows = chunk.map(mapConsultationListRow);
  const nextCursor = chunk.length === take ? (chunk[chunk.length - 1]?.id ?? null) : null;
  return { rows, nextCursor };
}

function consultationAmountNumber(row: {
  amount: { toString(): string } | null;
  income_amount: { toString(): string } | null;
  cost_amount: { toString(): string } | null;
}): number {
  const raw = row.amount?.toString() ?? row.income_amount?.toString() ?? row.cost_amount?.toString();
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function consultationAmountCurrency(row: {
  currency: string | null;
  income_currency: string | null;
  cost_currency: string | null;
  amount: { toString(): string } | null;
  income_amount: { toString(): string } | null;
  cost_amount: { toString(): string } | null;
}): string {
  if (row.amount != null) return normalizeListAmountCurrency(row.currency);
  if (row.income_amount != null) return normalizeListAmountCurrency(row.income_currency ?? row.currency);
  if (row.cost_amount != null) return normalizeListAmountCurrency(row.cost_currency ?? row.currency);
  return normalizeListAmountCurrency(row.currency ?? row.income_currency ?? row.cost_currency);
}

export async function loadConsultationsAmountTotal(params: {
  householdId: string;
  familyMemberId?: string | null;
  filters: ConsultationsListFilters;
}): Promise<AmountTotalsByCurrency> {
  const where = whereForConsultationsList(params);
  const rows = await prisma.therapy_consultations.findMany({
    where,
    select: {
      amount: true,
      income_amount: true,
      cost_amount: true,
      currency: true,
      income_currency: true,
      cost_currency: true,
    },
  });
  const totals = new Map<string, number>();
  for (const row of rows) {
    const amount = consultationAmountNumber(row);
    if (amount === 0 && row.amount == null && row.income_amount == null && row.cost_amount == null) continue;
    addAmountToTotalsByCurrency(totals, amount, consultationAmountCurrency(row));
  }
  return sortAmountTotalsByCurrency(totals);
}
