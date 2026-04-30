import { prisma } from "@/lib/auth";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import type { TravelListRowDto } from "./travel-list-client";

export type TravelReceivedFilter = "all" | "linked" | "unlinked";

export type TravelListFilters = {
  job: string;
  client: string;
  receipt: string;
  from: string;
  to: string;
  received: TravelReceivedFilter;
};

function parseDateFilter(raw: string): Date | null {
  const text = raw.trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function parseTravelReceivedFilter(raw: string | undefined): TravelReceivedFilter {
  if (raw === "linked" || raw === "unlinked") return raw;
  return "all";
}

export async function loadTravelRows(params: {
  householdId: string;
  familyMemberId?: string | null;
  filters: TravelListFilters;
  take?: number;
}): Promise<TravelListRowDto[]> {
  const { householdId, familyMemberId, filters, take = 500 } = params;
  const from = parseDateFilter(filters.from);
  const to = parseDateFilter(filters.to);
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);

  const entries = await prisma.therapy_travel_entries.findMany({
    where: {
      household_id: householdId,
      AND: [
        {
          OR: [{ job: jobScope }, { treatment: { job: jobScope } }],
        },
        ...(filters.job
          ? [
              {
                OR: [{ job_id: filters.job }, { treatment: { job_id: filters.job } }],
              },
            ]
          : []),
        ...(filters.client ? [{ treatment: { client_id: filters.client } }] : []),
        ...(filters.receipt
          ? [
              {
                receipt_allocations: {
                  some: {
                    receipt_id: filters.receipt,
                  },
                },
              },
            ]
          : []),
        ...(from || to
          ? [
              {
                occurred_at: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              },
            ]
          : []),
        ...(filters.received === "linked" ? [{ receipt_allocations: { some: {} } }] : []),
        ...(filters.received === "unlinked" ? [{ receipt_allocations: { none: {} } }] : []),
      ],
    },
    orderBy: { created_at: "desc" },
    take,
    include: { job: true, treatment: { include: { client: true, job: true } } },
  });

  return entries.map((entry) => ({
    id: entry.id,
    occurred_at_iso: entry.occurred_at ? entry.occurred_at.toISOString() : null,
    scope: entry.treatment_id ? "treatment" : "job",
    client_first_name: entry.treatment?.client.first_name ?? null,
    client_last_name: entry.treatment?.client.last_name ?? null,
    job_label: entry.treatment
      ? formatJobDisplayLabel(entry.treatment.job)
      : entry.job
        ? formatJobDisplayLabel(entry.job)
        : null,
    amount: entry.amount?.toString() ?? null,
    currency: entry.currency,
    linked_transaction_id: entry.linked_transaction_id ?? null,
  }));
}
