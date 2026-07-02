import { prisma } from "@/lib/auth";

const RECEIPT_PERIOD_PREVIEW_TAKE = 200;

export type ReceiptPeriodPreviewEntryType = "treatment" | "consultation" | "travel";

export type ReceiptPeriodPreviewRow = {
  id: string;
  entryType: ReceiptPeriodPreviewEntryType;
  occurredAtIso: string;
  clientLabel: string;
  amount: string;
  currency: string;
};

export type ReceiptPeriodPreviewTotals = {
  treatments: number;
  consultations: number;
  travel: number;
  combined: number;
};

export type ReceiptPeriodPreviewCounts = {
  treatments: number;
  consultations: number;
  travel: number;
};

export type ReceiptPeriodPreviewResult = {
  treatmentRows: { id: string; amount: string }[];
  consultationRows: { id: string; amount: string }[];
  travelRows: { id: string; amount: string }[];
  rows: ReceiptPeriodPreviewRow[];
  totals: ReceiptPeriodPreviewTotals;
  counts: ReceiptPeriodPreviewCounts;
  truncated: boolean;
};

function formatPersonName(person: { first_name: string; last_name: string | null } | null | undefined): string {
  if (!person) return "—";
  return `${person.first_name} ${person.last_name ?? ""}`.trim() || "—";
}

function decimalToNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function consultationAmountToString(row: { amount: { toString(): string } | null; income_amount: { toString(): string } | null }) {
  return row.amount?.toString() ?? row.income_amount?.toString() ?? null;
}

function occurredAtToIso(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "—";
}

export function endOfUtcDayForReceipt(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export async function loadReceiptPeriodPreview(params: {
  householdId: string;
  jobId: string;
  coveredPeriodStart: Date;
  coveredPeriodEnd: Date;
}): Promise<ReceiptPeriodPreviewResult> {
  const { householdId, jobId, coveredPeriodStart, coveredPeriodEnd } = params;
  const rangeWhere = {
    occurred_at: {
      gte: coveredPeriodStart,
      lte: endOfUtcDayForReceipt(coveredPeriodEnd),
    },
  };

  const [treatments, consultations, travelEntries] = await Promise.all([
    prisma.therapy_treatments.findMany({
      where: {
        household_id: householdId,
        job_id: jobId,
        receipt_allocations: { none: {} },
        amount: { not: null },
        ...rangeWhere,
      },
      select: {
        id: true,
        occurred_at: true,
        amount: true,
        currency: true,
        client: { select: { first_name: true, last_name: true } },
      },
      orderBy: { occurred_at: "desc" },
      take: RECEIPT_PERIOD_PREVIEW_TAKE,
    }),
    prisma.therapy_consultations.findMany({
      where: {
        household_id: householdId,
        job_id: jobId,
        receipt_allocations: { none: {} },
        ...rangeWhere,
      },
      select: {
        id: true,
        occurred_at: true,
        amount: true,
        income_amount: true,
        currency: true,
        income_currency: true,
        participants: {
          take: 1,
          select: {
            client: { select: { first_name: true, last_name: true } },
          },
        },
      },
      orderBy: { occurred_at: "desc" },
      take: RECEIPT_PERIOD_PREVIEW_TAKE,
    }),
    prisma.therapy_travel_entries.findMany({
      where: {
        household_id: householdId,
        receipt_allocations: { none: {} },
        amount: { not: null },
        OR: [{ job_id: jobId }, { treatment: { job_id: jobId } }, { consultation: { job_id: jobId } }],
        ...rangeWhere,
      },
      select: {
        id: true,
        occurred_at: true,
        amount: true,
        currency: true,
        treatment: { select: { client: { select: { first_name: true, last_name: true } } } },
        consultation: {
          select: {
            participants: {
              take: 1,
              select: { client: { select: { first_name: true, last_name: true } } },
            },
          },
        },
      },
      orderBy: [{ occurred_at: "desc" }, { created_at: "desc" }],
      take: RECEIPT_PERIOD_PREVIEW_TAKE,
    }),
  ]);

  const treatmentRows = treatments.map((row) => ({
    id: row.id,
    amount: row.amount!.toString(),
  }));
  const consultationRows = consultations
    .map((row) => ({
      id: row.id,
      amount: consultationAmountToString(row),
      occurred_at: row.occurred_at,
      currency: row.currency || row.income_currency || "ILS",
      clientLabel: formatPersonName(row.participants[0]?.client),
    }))
    .filter((row): row is NonNullable<typeof row> & { amount: string } => row.amount != null);
  const travelRows = travelEntries.map((row) => ({
    id: row.id,
    amount: row.amount!.toString(),
  }));

  const treatmentPreviewRows: ReceiptPeriodPreviewRow[] = treatments.map((row) => ({
    id: row.id,
    entryType: "treatment",
    occurredAtIso: occurredAtToIso(row.occurred_at),
    clientLabel: formatPersonName(row.client),
    amount: row.amount!.toString(),
    currency: row.currency,
  }));
  const consultationPreviewRows: ReceiptPeriodPreviewRow[] = consultationRows.map((row) => ({
    id: row.id,
    entryType: "consultation",
    occurredAtIso: occurredAtToIso(row.occurred_at),
    clientLabel: row.clientLabel,
    amount: row.amount,
    currency: row.currency,
  }));
  const travelPreviewRows: ReceiptPeriodPreviewRow[] = travelEntries.map((row) => ({
    id: row.id,
    entryType: "travel",
    occurredAtIso: occurredAtToIso(row.occurred_at),
    clientLabel: formatPersonName(row.treatment?.client ?? row.consultation?.participants[0]?.client),
    amount: row.amount!.toString(),
    currency: row.currency,
  }));

  const totals = {
    treatments: treatmentRows.reduce((sum, row) => sum + decimalToNumber(row.amount), 0),
    consultations: consultationRows.reduce((sum, row) => sum + decimalToNumber(row.amount), 0),
    travel: travelRows.reduce((sum, row) => sum + decimalToNumber(row.amount), 0),
    combined: 0,
  };
  totals.combined = totals.treatments + totals.consultations + totals.travel;

  const rows = [...treatmentPreviewRows, ...consultationPreviewRows, ...travelPreviewRows].sort((a, b) => {
    if (a.occurredAtIso === b.occurredAtIso) return a.entryType.localeCompare(b.entryType);
    return a.occurredAtIso < b.occurredAtIso ? 1 : -1;
  });

  return {
    treatmentRows,
    consultationRows: consultationRows.map((row) => ({ id: row.id, amount: row.amount })),
    travelRows,
    rows,
    totals,
    counts: {
      treatments: treatmentRows.length,
      consultations: consultationRows.length,
      travel: travelRows.length,
    },
    truncated:
      treatments.length === RECEIPT_PERIOD_PREVIEW_TAKE ||
      consultations.length === RECEIPT_PERIOD_PREVIEW_TAKE ||
      travelEntries.length === RECEIPT_PERIOD_PREVIEW_TAKE,
  };
}
