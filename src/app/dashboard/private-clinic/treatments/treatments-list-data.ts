import { prisma } from "@/lib/auth";
import { decimalToNumber, treatmentPaymentStatus, type TherapyPaymentStatus } from "@/lib/therapy/payment";
import { formatPrivateClinicJobLabel, jobWhereInPrivateClinicModule } from "@/lib/private-clinic/jobs-scope";
import type { Prisma } from "@/generated/prisma/client";

export type TreatmentsSortKey = "occurred_at" | "client" | "job" | "amount";
export type TreatmentsSortDir = "asc" | "desc";
export type TreatmentsPaidFilter = "all" | "paid" | "partial" | "unpaid";

export type TreatmentsListFilters = {
  paid: TreatmentsPaidFilter;
  job: string;
  program: string;
  client: string;
  from: string;
  to: string;
  sort: TreatmentsSortKey;
  dir: TreatmentsSortDir;
};

export type TreatmentListRowDto = {
  id: string;
  occurred_at_iso: string;
  client_first_name: string;
  client_last_name: string | null;
  job_label: string;
  amount: string;
  currency: string;
  payment_status: TherapyPaymentStatus;
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
  filters: TreatmentsListFilters;
  take: number;
  cursorId?: string;
}): Promise<TreatmentsCursorPage> {
  const { householdId, filters, take, cursorId } = params;
  const from = parseDateFilter(filters.from);
  const to = parseDateFilter(filters.to);

  const baseWhere: Prisma.therapy_treatmentsWhereInput = {
    household_id: householdId,
    job: jobWhereInPrivateClinicModule,
    ...(filters.job ? { job_id: filters.job } : {}),
    ...(filters.program ? { program_id: filters.program } : {}),
    ...(filters.client ? { client_id: filters.client } : {}),
    ...(from || to
      ? {
          occurred_at: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

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
        client_first_name: t.client.first_name,
        client_last_name: t.client.last_name,
        job_label: formatPrivateClinicJobLabel(t.job),
        amount: t.amount.toString(),
        currency: t.currency,
        payment_status: paymentStatus,
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
