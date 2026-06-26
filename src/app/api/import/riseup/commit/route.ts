import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { normalizeComparableName } from "@/lib/riseup-matching";
import { buildRiseUpImportIdentity, riseUpRowToJson } from "@/lib/riseup-import";
import type { RiseUpCommitRowPayload } from "@/lib/riseup-commit-types";

type CommitBody = {
  fileName: string;
  rows: RiseUpCommitRowPayload[];
};

function decimalDate(value: string | null): Date | null {
  return value ? new Date(value + "T12:00:00.000Z") : null;
}

function rowIdentity(r: RiseUpCommitRowPayload): {
  importKey: string;
  contentHash: string;
} {
  const identity = buildRiseUpImportIdentity({
    businessName: r.businessName,
    paymentMethodRaw: r.paymentMethodRaw,
    paymentIdentifierRaw: r.paymentIdentifierRaw,
    sourceKind: r.sourceKind,
    paymentDate: r.paymentDate,
    chargeDate: r.chargeDate,
    amount: r.amount,
    originalAmount: r.originalAmount,
    cashflowCategory: r.cashflowCategory,
    isZeroAmountPending: r.isZeroAmountPending,
    raw: r.raw,
  });
  return {
    importKey: identity.importKey,
    contentHash: identity.contentHash,
  };
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

    const body = (await req.json()) as CommitBody;
    if (!body?.fileName || !Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const userId = (token.id as string | undefined) ?? (token.sub as string | undefined);
    const createdTxIds: string[] = [];
    const updatedTxIds: string[] = [];
    let skippedCount = 0;
    let changedRows = 0;
    let ambiguousRows = 0;

    await prisma.$transaction(async (tx) => {
      const doc = await tx.documents.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          bank_account_id: null,
          file_name: body.fileName,
          file_type: "riseup_csv",
          processing_status: "completed",
        },
      });

      for (const r of body.rows) {
        const action = r.import_action ?? "create";
        const identity = rowIdentity(r);
        const existing = await tx.transactions.findFirst({
          where: {
            household_id: householdId,
            riseup_import_key: identity.importKey,
          },
          select: {
            id: true,
            source_record_id: true,
            riseup_content_hash: true,
          },
        });

        if (action === "skip") {
          skippedCount++;
          if (existing && existing.riseup_content_hash !== identity.contentHash) changedRows++;
          continue;
        }

        if (action === "create" && existing) {
          skippedCount++;
          continue;
        }

        let payeeId: string | null =
          r.payee_id &&
          (await tx.payees.findFirst({
            where: { id: r.payee_id, household_id: householdId },
          }))
            ? r.payee_id
            : null;

        if (!payeeId && r.new_payee_name?.trim()) {
          const name = r.new_payee_name.trim();
          const p = await tx.payees.create({
            data: {
              id: crypto.randomUUID(),
              household_id: householdId,
              name,
              normalized_name: normalizeComparableName(name) || null,
            },
          });
          payeeId = p.id;
        }

        const categoryId =
          r.category_id &&
          (await tx.categories.findFirst({
            where: { id: r.category_id, household_id: householdId },
          }))
            ? r.category_id
            : null;
        const jobId =
          r.job_id &&
          (await tx.jobs.findFirst({
            where: { id: r.job_id, household_id: householdId },
          }))
            ? r.job_id
            : null;
        const subscriptionId =
          r.subscription_id &&
          (await tx.subscriptions.findFirst({
            where: { id: r.subscription_id, household_id: householdId },
          }))
            ? r.subscription_id
            : null;
        const loanId =
          r.loan_id &&
          (await tx.loans.findFirst({
            where: { id: r.loan_id, household_id: householdId },
          }))
            ? r.loan_id
            : null;

        const bankId =
          r.bank_account_id &&
          (await tx.bank_accounts.findFirst({
            where: { id: r.bank_account_id, household_id: householdId },
          }))
            ? r.bank_account_id
            : null;
        const cardId =
          r.credit_card_id &&
          (await tx.credit_cards.findFirst({
            where: { id: r.credit_card_id, household_id: householdId },
          }))
            ? r.credit_card_id
            : null;

        const amount = r.amount;
        const transaction_direction =
          amount < 0 ? "debit" : amount > 0 ? "credit" : "debit";
        const absAmount = Math.abs(amount);
        const transaction_date = decimalDate(r.paymentDate) ?? new Date();

        const riseup_charge_date = decimalDate(r.chargeDate);

        const sourceRecordData = {
          row_index: r.rowIndex,
          raw_date: r.paymentDate,
          raw_amount: String(amount),
          raw_description: r.businessName,
          parsed_date: transaction_date,
          parsed_amount: absAmount,
          parsed_direction: transaction_direction,
          riseup_row: riseUpRowToJson(r.raw),
        };

        if (action === "update" && existing) {
          if (existing.riseup_content_hash !== identity.contentHash) changedRows++;
          let sourceRecordId = existing.source_record_id;
          if (sourceRecordId) {
            await tx.source_records.update({
              where: { id: sourceRecordId },
              data: sourceRecordData,
            });
          } else {
            const sr = await tx.source_records.create({
              data: {
                id: crypto.randomUUID(),
                document_id: doc.id,
                ...sourceRecordData,
              },
            });
            sourceRecordId = sr.id;
          }

          await tx.transactions.update({
            where: { id: existing.id },
            data: {
              source_record_id: sourceRecordId,
              transaction_date,
              amount: absAmount,
              transaction_direction,
              transaction_type: "regular",
              description: r.businessName,
              notes: r.cashflowCategory ? `RiseUp: ${r.cashflowCategory}` : null,
              riseup_charge_date,
              riseup_cashflow_month: r.raw["שייך לתזרים חודש"]?.trim() || null,
              riseup_is_zero_amount_pending: r.isZeroAmountPending,
              riseup_original_amount:
                r.originalAmount !== null && r.originalAmount !== undefined
                  ? Math.abs(r.originalAmount)
                  : null,
              riseup_import_key: identity.importKey,
              riseup_content_hash: identity.contentHash,
              import_status: "confirmed",
            },
          });
          updatedTxIds.push(existing.id);
          continue;
        }

        if (action === "update" && !existing) {
          ambiguousRows++;
          skippedCount++;
          continue;
        }

        const sr = await tx.source_records.create({
          data: {
            id: crypto.randomUUID(),
            document_id: doc.id,
            ...sourceRecordData,
          },
        });

        const t = await tx.transactions.create({
          data: {
            id: crypto.randomUUID(),
            household_id: householdId,
            bank_account_id: bankId,
            credit_card_id: cardId,
            loan_id: loanId,
            source_record_id: sr.id,
            document_id: doc.id,
            transaction_date,
            amount: absAmount,
            transaction_direction,
            transaction_type: "regular",
            description: r.businessName,
            category_id: categoryId,
            payee_id: payeeId,
            notes: r.cashflowCategory ? `RiseUp: ${r.cashflowCategory}` : null,
            job_id: jobId,
            subscription_id: subscriptionId,
            riseup_charge_date,
            riseup_cashflow_month: r.raw["שייך לתזרים חודש"]?.trim() || null,
            riseup_is_zero_amount_pending: r.isZeroAmountPending,
            riseup_original_amount:
              r.originalAmount !== null && r.originalAmount !== undefined
                ? Math.abs(r.originalAmount)
                : null,
            riseup_import_key: identity.importKey,
            riseup_content_hash: identity.contentHash,
            import_status: "confirmed",
          },
        });
        createdTxIds.push(t.id);
      }

      await tx.riseup_import_audits.create({
        data: {
          id: crypto.randomUUID(),
          household_id: householdId,
          user_id: userId ?? null,
          file_name: body.fileName,
          import_mode: "incremental",
          status: "successful",
          row_count: body.rows.length,
          created_transactions: createdTxIds.length,
          updated_transactions: updatedTxIds.length,
          skipped_transactions: skippedCount,
          changed_rows: changedRows,
          ambiguous_rows: ambiguousRows,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      transactionIds: createdTxIds,
      updatedTransactionIds: updatedTxIds,
      count: createdTxIds.length,
      updatedCount: updatedTxIds.length,
      skippedCount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Commit failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
