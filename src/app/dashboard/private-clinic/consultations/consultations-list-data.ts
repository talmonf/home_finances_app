import { prisma } from "@/lib/auth";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import type { Prisma } from "@/generated/prisma/client";

export type ConsultationsSortKey = "occurred_at" | "type" | "job" | "amount";
export type ConsultationsSortDir = "asc" | "desc";
export type ConsultationsReceivedFilter = "all" | "linked" | "unlinked";

export type ConsultationsListFilters = {
  job: string;
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

export async function loadConsultationsRows(params: {
  householdId: string;
  familyMemberId?: string | null;
  filters: ConsultationsListFilters;
  take?: number;
}): Promise<ConsultationListRowDto[]> {
  const { householdId, familyMemberId, filters, take = 150 } = params;
  const from = parseDateFilter(filters.from);
  const to = parseDateFilter(filters.to);

  const rows = await prisma.therapy_consultations.findMany({
    where: {
      household_id: householdId,
      job: jobWherePrivateClinicScoped(familyMemberId),
      ...(filters.job ? { job_id: filters.job } : {}),
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
    },
    orderBy: orderByForConsultations(filters.sort, filters.dir),
    take,
    include: {
      job: true,
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
        orderBy: { created_at: "desc" },
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
    },
  });

  return rows.map((row) => {
    const participantClients = row.participants.map((p) => ({
      id: p.client.id,
      name: `${p.client.first_name} ${p.client.last_name ?? ""}`.trim(),
      name_he: null,
    }));
    const fallbackReceiptClient = row.receipt_allocations[0]?.receipt.client
      ? [
          {
            id: row.receipt_allocations[0].receipt.client.id,
            name: `${row.receipt_allocations[0].receipt.client.first_name} ${row.receipt_allocations[0].receipt.client.last_name ?? ""}`.trim(),
            name_he: null,
          },
        ]
      : [];
    return {
    id: row.id,
    job_id: row.job_id,
    job_label: formatJobDisplayLabel(row.job),
    consultation_type_id: row.consultation_type_id,
    consultation_type_name: row.consultation_type.name,
    consultation_type_name_he: row.consultation_type.name_he,
    occurred_at_iso: row.occurred_at.toISOString(),
    amount: row.amount?.toString() ?? row.income_amount?.toString() ?? row.cost_amount?.toString() ?? null,
    currency: row.currency || row.income_currency || row.cost_currency,
    linked_transaction_id: row.linked_transaction_id ?? row.linked_income_transaction_id ?? row.linked_cost_transaction_id,
    linked_receipt_id: row.receipt_allocations[0]?.receipt_id ?? null,
    linked_receipt_number: row.receipt_allocations[0]?.receipt.receipt_number ?? null,
    clients: participantClients.length > 0 ? participantClients : fallbackReceiptClient,
    notes: row.notes,
  };
  });
}
