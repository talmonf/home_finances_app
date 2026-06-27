import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import {
  buildRiseUpImportIdentity,
  parseRiseUpCsvBuffer,
  parseRiseUpRawRecord,
  type RiseUpParsedRow,
} from "@/lib/riseup-import";
import { matchRiseUpRowsForHousehold } from "@/lib/riseup-matching";
import {
  generateRiseUpImportProposals,
  summarizeRiseUpProposals,
} from "@/lib/riseup-proposals";
import {
  analyzeRiseUpPatterns,
  summarizeRiseUpPatterns,
} from "@/lib/riseup-patterns";
import type {
  RiseUpExistingTransactionSummary,
  RiseUpImportDiff,
  RiseUpImportProposal,
  RiseUpImportRowStatus,
} from "@/lib/riseup-commit-types";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

type ExistingRiseUpTransaction = {
  id: string;
  transaction_date: Date;
  amount: unknown;
  transaction_direction: "debit" | "credit";
  description: string | null;
  riseup_charge_date: Date | null;
  riseup_original_amount: unknown | null;
  riseup_content_hash: string | null;
};

type LegacyBackfillSummary = {
  legacyScanned: number;
  legacyBackfilled: number;
  legacyAmbiguous: number;
};

function decimalToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function decimalToNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return decimalToNumber(value);
}

function dateOnly(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function signedAmount(tx: ExistingRiseUpTransaction): number {
  const amount = decimalToNumber(tx.amount);
  return tx.transaction_direction === "debit" ? -Math.abs(amount) : Math.abs(amount);
}

function formatAmount(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return value.toFixed(2);
}

function existingSummary(
  tx: ExistingRiseUpTransaction,
): RiseUpExistingTransactionSummary {
  return {
    id: tx.id,
    transactionDate: dateOnly(tx.transaction_date) ?? "",
    amount: decimalToNumber(tx.amount),
    transactionDirection: tx.transaction_direction,
    description: tx.description,
    contentHash: tx.riseup_content_hash,
  };
}

function diffExisting(
  row: RiseUpParsedRow,
  tx: ExistingRiseUpTransaction,
): RiseUpImportDiff[] {
  const diffs: RiseUpImportDiff[] = [];
  const add = (
    field: string,
    label: string,
    existing: string | null,
    incoming: string | null,
  ) => {
    if ((existing ?? "") !== (incoming ?? "")) {
      diffs.push({ field, label, existing, incoming });
    }
  };

  add("transaction_date", "Payment date", dateOnly(tx.transaction_date), row.paymentDate || null);
  add("amount", "Signed amount", formatAmount(signedAmount(tx)), formatAmount(row.amount));
  add("description", "Merchant", tx.description, row.businessName || null);
  add("riseup_charge_date", "Charge date", dateOnly(tx.riseup_charge_date), row.chargeDate);
  add(
    "riseup_original_amount",
    "Original amount",
    formatAmount(decimalToNullableNumber(tx.riseup_original_amount)),
    formatAmount(row.originalAmount),
  );
  return diffs;
}

function rawRecordFromJson(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    out[key] = String(rawValue ?? "").trim();
  }
  return out;
}

async function backfillLegacyRiseUpIdentities(householdId: string): Promise<LegacyBackfillSummary> {
  const legacy = await prisma.transactions.findMany({
    where: {
      household_id: householdId,
      riseup_import_key: null,
      OR: [
        { document: { is: { file_type: "riseup_csv" } } },
        { source_record: { isNot: null } },
      ],
    },
    select: {
      id: true,
      source_record: {
        select: {
          riseup_row: true,
        },
      },
    },
  });

  const keyed = new Map<
    string,
    Array<{ id: string; importKey: string; contentHash: string }>
  >();

  for (const tx of legacy) {
    const raw = rawRecordFromJson(tx.source_record?.riseup_row);
    if (!raw) continue;
    const row = parseRiseUpRawRecord(raw);
    const identity = buildRiseUpImportIdentity(row);
    keyed.set(identity.importKey, [
      ...(keyed.get(identity.importKey) ?? []),
      { id: tx.id, importKey: identity.importKey, contentHash: identity.contentHash },
    ]);
  }

  const unique = [...keyed.values()].filter((items) => items.length === 1).map((items) => items[0]!);
  const ambiguous = [...keyed.values()].filter((items) => items.length > 1).reduce((sum, items) => sum + items.length, 0);
  let legacyBackfilled = 0;

  if (unique.length > 0) {
    const existingKeys = new Set(
      (
        await prisma.transactions.findMany({
          where: {
            household_id: householdId,
            riseup_import_key: { in: unique.map((item) => item.importKey) },
          },
          select: { riseup_import_key: true },
        })
      )
        .map((item) => item.riseup_import_key)
        .filter((key): key is string => !!key),
    );

    for (const item of unique) {
      if (existingKeys.has(item.importKey)) continue;
      const updated = await prisma.transactions.updateMany({
        where: { id: item.id, household_id: householdId, riseup_import_key: null },
        data: {
          riseup_import_key: item.importKey,
          riseup_content_hash: item.contentHash,
        },
      });
      legacyBackfilled += updated.count;
    }
  }

  return {
    legacyScanned: legacy.length,
    legacyBackfilled,
    legacyAmbiguous: ambiguous,
  };
}

async function persistAnalyzeProposals(
  householdId: string,
  proposals: RiseUpImportProposal[],
): Promise<RiseUpImportProposal[]> {
  await prisma.$transaction(async (tx) => {
    await tx.riseup_import_proposals.deleteMany({
      where: {
        household_id: householdId,
        import_audit_id: null,
        status: "proposed",
      },
    });

    for (const p of proposals) {
      const proposalId = crypto.randomUUID();
      await tx.riseup_import_proposals.create({
        data: {
          id: proposalId,
          household_id: householdId,
          import_audit_id: null,
          proposal_kind: p.proposal_kind,
          entity_kind: p.entity_kind,
          target_entity_id: p.target_entity_id,
          status: p.status,
          confidence: p.confidence,
          title: p.title,
          summary: p.summary,
          payload_json: p.payload_json as Prisma.InputJsonValue,
          proposed_changes_json: p.proposed_changes_json as Prisma.InputJsonValue,
          supporting_transactions: {
            create: p.supportRows.map((support) => ({
              id: crypto.randomUUID(),
              household_id: householdId,
              transaction_id: support.transaction_id ?? null,
              riseup_import_key: support.riseup_import_key ?? null,
              row_index: support.rowIndex,
              support_role: support.support_role,
              confidence: support.confidence ?? null,
            })),
          },
        },
      });
      p.id = proposalId;
    }
  });

  return proposals;
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const householdId = token.householdId as string | undefined;
    if (!householdId || token.isSuperAdmin) {
      return NextResponse.json(
        { error: "Household users only. Sign in as a household member." },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 4 MB." }, { status: 400 });
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv")) {
      return NextResponse.json({ error: "RiseUp analyze expects a .csv export." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseRiseUpCsvBuffer(buffer);
    const legacySummary = await backfillLegacyRiseUpIdentities(householdId);
    const identities = new Map(
      parsed.map((row) => {
        const identity = buildRiseUpImportIdentity(row);
        return [row.rowIndex, identity] as const;
      }),
    );
    const rows = await matchRiseUpRowsForHousehold(householdId, parsed);

    const importKeys = rows
      .map((row) => identities.get(row.rowIndex)?.importKey)
      .filter((key): key is string => !!key);
    const incomingKeyCounts = new Map<string, number>();
    for (const key of importKeys) {
      incomingKeyCounts.set(key, (incomingKeyCounts.get(key) ?? 0) + 1);
    }

    const existing = await prisma.transactions.findMany({
      where: {
        household_id: householdId,
        riseup_import_key: { in: importKeys },
      },
      select: {
        id: true,
        riseup_import_key: true,
        riseup_content_hash: true,
        transaction_date: true,
        amount: true,
        transaction_direction: true,
        description: true,
        riseup_charge_date: true,
        riseup_original_amount: true,
      },
    });
    const existingByKey = new Map<string, ExistingRiseUpTransaction[]>();
    for (const tx of existing) {
      if (!tx.riseup_import_key) continue;
      existingByKey.set(tx.riseup_import_key, [
        ...(existingByKey.get(tx.riseup_import_key) ?? []),
        tx as ExistingRiseUpTransaction,
      ]);
    }

    const classifiedRows = rows.map((row) => {
      const identity = identities.get(row.rowIndex) ?? buildRiseUpImportIdentity(row);
      const matches = existingByKey.get(identity.importKey) ?? [];
      let importStatus: RiseUpImportRowStatus = "new";
      let existingTransaction: RiseUpExistingTransactionSummary | null = null;
      let changedFields: RiseUpImportDiff[] = [];

      if (matches.length > 1) {
        importStatus = "ambiguous";
      } else if ((incomingKeyCounts.get(identity.importKey) ?? 0) > 1) {
        importStatus = "ambiguous";
      } else if (matches.length === 1) {
        const match = matches[0];
        existingTransaction = existingSummary(match);
        if (match.riseup_content_hash === identity.contentHash) {
          importStatus = "existing";
        } else {
          importStatus = "changed";
          changedFields = diffExisting(row, match);
        }
      }

      return {
        ...row,
        riseup_import_key: identity.importKey,
        riseup_content_hash: identity.contentHash,
        riseup_identity_basis: identity.basis,
        importStatus,
        existingTransaction,
        changedFields,
      };
    });
    const patterns = analyzeRiseUpPatterns(classifiedRows);
    const patternSummary = summarizeRiseUpPatterns(patterns);
    const proposals = await persistAnalyzeProposals(
      householdId,
      generateRiseUpImportProposals(classifiedRows, patterns),
    );
    const proposalSummary = summarizeRiseUpProposals(proposals);

    return NextResponse.json({
      fileName: file.name,
      rowCount: classifiedRows.length,
      summary: {
        new: classifiedRows.filter((r) => r.importStatus === "new").length,
        existing: classifiedRows.filter((r) => r.importStatus === "existing").length,
        changed: classifiedRows.filter((r) => r.importStatus === "changed").length,
        ambiguous: classifiedRows.filter((r) => r.importStatus === "ambiguous").length,
        needsReview: classifiedRows.filter((r) => r.needsReview).length,
        ...legacySummary,
        proposals: proposalSummary,
        patterns: patternSummary,
      },
      patterns,
      wizardSections: [
        "instruments",
        "core_mappings",
        "domain_entities",
        "transaction_actions",
        "historical_backfill",
      ],
      proposals,
      rows: classifiedRows,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analyze failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
