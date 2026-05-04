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
          OR: [{ job: jobScope }, { treatment: { job: jobScope } }, { consultation: { job: jobScope } }],
        },
        ...(filters.job
          ? [
              {
                OR: [
                  { job_id: filters.job },
                  { treatment: { job_id: filters.job } },
                  { consultation: { job_id: filters.job } },
                ],
              },
            ]
          : []),
        ...(filters.client
          ? [
              {
                OR: [
                  { treatment: { client_id: filters.client } },
                  {
                    consultation: {
                      participants: { some: { client_id: filters.client } },
                    },
                  },
                ],
              },
            ]
          : []),
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
    include: {
      job: true,
      treatment: { include: { client: true, job: true } },
      consultation: {
        include: {
          job: true,
          consultation_type: true,
          participants: { take: 1, include: { client: true } },
        },
      },
      receipt_allocations: {
        select: { receipt_id: true, receipt: { select: { receipt_number: true } } },
        take: 1,
        orderBy: { created_at: "desc" },
      },
    },
  });

  return entries.map((entry) => {
    const scope: "job" | "treatment" | "consultation" = entry.treatment_id
      ? "treatment"
      : entry.consultation_id
        ? "consultation"
        : "job";
    const consultClient = entry.consultation?.participants[0]?.client;
    return {
    id: entry.id,
    occurred_at_iso: entry.occurred_at ? entry.occurred_at.toISOString() : null,
    scope,
    client_first_name:
      entry.treatment?.client.first_name ?? consultClient?.first_name ?? null,
    client_last_name: entry.treatment?.client.last_name ?? consultClient?.last_name ?? null,
    consultation_type_name:
      entry.consultation?.consultation_type.name_he ||
      entry.consultation?.consultation_type.name ||
      null,
    job_label: entry.treatment
      ? formatJobDisplayLabel(entry.treatment.job)
      : entry.consultation
        ? formatJobDisplayLabel(entry.consultation.job)
        : entry.job
          ? formatJobDisplayLabel(entry.job)
          : null,
    amount: entry.amount?.toString() ?? null,
    currency: entry.currency,
    linked_receipt_id: entry.receipt_allocations[0]?.receipt_id ?? null,
    linked_receipt_number: entry.receipt_allocations[0]?.receipt.receipt_number ?? null,
  };
  });
}
