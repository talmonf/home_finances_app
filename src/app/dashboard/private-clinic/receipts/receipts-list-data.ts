import { prisma } from "@/lib/auth";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWhereInPrivateClinicModule } from "@/lib/private-clinic/jobs-scope";
import type { Prisma } from "@/generated/prisma/client";

export type ReceiptsSortKey = "issued_at" | "number" | "job" | "amount" | "treatments";
export type ReceiptsSortDir = "asc" | "desc";
export type ReceiptsRecipientFilter = "all" | "client" | "organization";
export type ReceiptsBankFilter = "all" | "linked" | "unlinked";

export type ReceiptsListFilters = {
  job: string;
  client: string;
  from: string;
  to: string;
  recipient: ReceiptsRecipientFilter;
  bank: ReceiptsBankFilter;
  sort: ReceiptsSortKey;
  dir: ReceiptsSortDir;
};

export type ReceiptListRowDto = {
  id: string;
  receipt_number: string;
  issued_at_iso: string;
  recipient_type: "client" | "organization";
  job_label: string;
  total_amount: string;
  currency: string;
  covered_period_start_iso: string | null;
  covered_period_end_iso: string | null;
  linked_treatments_count: number;
  linked_treatment_allocations_count: number;
  linked_consultation_allocations_count: number;
  linked_travel_allocations_count: number;
  client_id: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
};

export type ReceiptsCursorPage = {
  rows: ReceiptListRowDto[];
  nextCursor: string | null;
};

export function parseReceiptsSortKey(raw: string | undefined): ReceiptsSortKey {
  if (raw === "number" || raw === "job" || raw === "amount" || raw === "treatments") return raw;
  return "issued_at";
}

export function parseReceiptsSortDir(raw: string | undefined): ReceiptsSortDir {
  return raw === "asc" ? "asc" : "desc";
}

export function parseReceiptsRecipientFilter(raw: string | undefined): ReceiptsRecipientFilter {
  if (raw === "client" || raw === "organization") return raw;
  return "all";
}

export function parseReceiptsBankFilter(raw: string | undefined): ReceiptsBankFilter {
  if (raw === "linked" || raw === "unlinked") return raw;
  return "all";
}

function parseDateFilter(raw: string): Date | null {
  const text = raw.trim();
  if (!text) return null;
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function orderByForReceipts(
  sort: ReceiptsSortKey,
  dir: ReceiptsSortDir,
): Prisma.therapy_receiptsOrderByWithRelationInput[] {
  if (sort === "number") return [{ receipt_number: dir }, { issued_at: "desc" }, { id: "desc" }];
  if (sort === "job") return [{ job: { job_title: dir } }, { issued_at: "desc" }, { id: "desc" }];
  if (sort === "amount") return [{ total_amount: dir }, { issued_at: "desc" }, { id: "desc" }];
  return [{ issued_at: dir }, { id: dir }];
}

export async function loadReceiptsCursorPage(params: {
  householdId: string;
  filters: ReceiptsListFilters;
  take: number;
  cursorId?: string;
}): Promise<ReceiptsCursorPage> {
  const { householdId, filters, take, cursorId } = params;
  const from = parseDateFilter(filters.from);
  const to = parseDateFilter(filters.to);

  const maxIterations = filters.sort === "treatments" ? 6 : 1;
  const chunkSize = Math.max(take * 2, 40);
  const out: ReceiptListRowDto[] = [];
  let nextCursor: string | null = cursorId ?? null;
  let iterations = 0;

  while (out.length < take && iterations < maxIterations) {
    const chunk = await prisma.therapy_receipts.findMany({
      where: {
        household_id: householdId,
        job: jobWhereInPrivateClinicModule,
        ...(filters.job ? { job_id: filters.job } : {}),
        ...(filters.client
          ? {
              allocations: {
                some: {
                  treatment: {
                    client_id: filters.client,
                  },
                },
              },
            }
          : {}),
        ...(from || to
          ? {
              issued_at: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
        ...(filters.recipient === "client" || filters.recipient === "organization"
          ? { recipient_type: filters.recipient }
          : {}),
        ...(filters.bank === "linked" ? { linked_transaction_id: { not: null } } : {}),
        ...(filters.bank === "unlinked" ? { linked_transaction_id: null } : {}),
      },
      orderBy: orderByForReceipts(filters.sort, filters.dir),
      ...(nextCursor ? { cursor: { id: nextCursor }, skip: 1 } : {}),
      take: filters.sort === "treatments" ? chunkSize : take,
      include: {
        job: true,
        allocations: {
          orderBy: { created_at: "asc" },
          include: {
            treatment: {
              include: {
                client: { select: { id: true, first_name: true, last_name: true } },
              },
            },
          },
        },
        _count: {
          select: {
            allocations: true,
            consultation_allocations: true,
            travel_allocations: true,
          },
        },
      },
    });
    iterations += 1;
    if (chunk.length === 0) {
      nextCursor = null;
      break;
    }

    nextCursor = chunk[chunk.length - 1]?.id ?? null;

    const mappedChunk: ReceiptListRowDto[] = chunk.map((rec) => {
      const firstClient = rec.allocations[0]?.treatment.client;
      return {
        id: rec.id,
        receipt_number: rec.receipt_number,
        issued_at_iso: rec.issued_at.toISOString(),
        recipient_type: rec.recipient_type,
        job_label: formatJobDisplayLabel(rec.job),
        total_amount: rec.total_amount.toString(),
        currency: rec.currency,
        covered_period_start_iso: rec.covered_period_start ? rec.covered_period_start.toISOString() : null,
        covered_period_end_iso: rec.covered_period_end ? rec.covered_period_end.toISOString() : null,
        linked_treatment_allocations_count: rec._count.allocations,
        linked_consultation_allocations_count: rec._count.consultation_allocations,
        linked_travel_allocations_count: rec._count.travel_allocations,
        linked_treatments_count:
          rec._count.allocations + rec._count.consultation_allocations + rec._count.travel_allocations,
        client_id: firstClient?.id ?? null,
        client_first_name: firstClient?.first_name ?? null,
        client_last_name: firstClient?.last_name ?? null,
      };
    });

    if (filters.sort === "treatments") {
      const direction = filters.dir === "asc" ? 1 : -1;
      mappedChunk.sort((a, b) => {
        if (a.linked_treatments_count === b.linked_treatments_count) {
          return a.issued_at_iso.localeCompare(b.issued_at_iso) * -1;
        }
        return (a.linked_treatments_count - b.linked_treatments_count) * direction;
      });
    }

    out.push(...mappedChunk);
    if (chunk.length < (filters.sort === "treatments" ? chunkSize : take)) {
      break;
    }
  }

  if (out.length < take) nextCursor = null;
  return { rows: out.slice(0, take), nextCursor };
}
