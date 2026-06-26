import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import {
  buildRiseUpImportIdentity,
  parseRiseUpCsvBuffer,
  type RiseUpParsedRow,
} from "@/lib/riseup-import";
import { matchRiseUpRowsForHousehold } from "@/lib/riseup-matching";
import type {
  RiseUpExistingTransactionSummary,
  RiseUpImportDiff,
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

    return NextResponse.json({
      fileName: file.name,
      rowCount: classifiedRows.length,
      summary: {
        new: classifiedRows.filter((r) => r.importStatus === "new").length,
        existing: classifiedRows.filter((r) => r.importStatus === "existing").length,
        changed: classifiedRows.filter((r) => r.importStatus === "changed").length,
        ambiguous: classifiedRows.filter((r) => r.importStatus === "ambiguous").length,
      },
      rows: classifiedRows,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analyze failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
