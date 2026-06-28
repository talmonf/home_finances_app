import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";
import { normalizeComparableName } from "@/lib/riseup-matching";
import { buildRiseUpImportIdentity, riseUpRowToJson } from "@/lib/riseup-import";
import type {
  RiseUpCommitProposalPayload,
  RiseUpCommitRowPayload,
} from "@/lib/riseup-commit-types";

type CommitBody = {
  fileName: string;
  rows: RiseUpCommitRowPayload[];
  proposals?: RiseUpCommitProposalPayload[];
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

function recordFromJson(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  const s = value === null || value === undefined ? "" : String(value).trim();
  return s || null;
}

function numberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
    let skippedExisting = 0;
    let skippedByUser = 0;
    let proposalsApproved = 0;
    let proposalsApplied = 0;
    let proposalLinksCreated = 0;
    const importAuditId = crypto.randomUUID();

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
          skippedByUser++;
          if (existing && existing.riseup_content_hash !== identity.contentHash) changedRows++;
          continue;
        }

        if (action === "create" && existing) {
          skippedCount++;
          skippedExisting++;
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

      const proposalActions = new Map(
        (body.proposals ?? []).map((p) => [p.id, p.action] as const),
      );
      const proposalOverrides = new Map(
        (body.proposals ?? []).map((p) => [p.id, p.payloadOverrides ?? {}] as const),
      );
      const proposalIds = [...proposalActions.keys()];
      if (proposalIds.length > 0) {
        const proposals = await tx.riseup_import_proposals.findMany({
          where: {
            id: { in: proposalIds },
            household_id: householdId,
          },
          include: {
            supporting_transactions: true,
          },
        });

        for (const proposal of proposals) {
          const action = proposalActions.get(proposal.id) ?? "skip";
          if (action === "skip") continue;
          if (action === "reject") {
            await tx.riseup_import_proposals.update({
              where: { id: proposal.id },
              data: { status: "rejected" },
            });
            continue;
          }

          proposalsApproved++;
          const payload = {
            ...recordFromJson(proposal.payload_json),
            ...recordFromJson(proposalOverrides.get(proposal.id)),
          };
          let targetEntityId = proposal.target_entity_id;
          let applied = false;

          if (!targetEntityId) {
            if (proposal.entity_kind === "payee") {
              const name = stringField(payload, "suggestedName");
              if (name) {
                const created = await tx.payees.create({
                  data: {
                    id: crypto.randomUUID(),
                    household_id: householdId,
                    name,
                    normalized_name: normalizeComparableName(name) || null,
                  },
                });
                targetEntityId = created.id;
                applied = true;
              }
            } else if (proposal.entity_kind === "category") {
              const name = stringField(payload, "suggestedName") ?? stringField(payload, "riseUpCategory");
              if (name) {
                const created = await tx.categories.create({
                  data: {
                    id: crypto.randomUUID(),
                    household_id: householdId,
                    name,
                  },
                });
                targetEntityId = created.id;
                applied = true;
              }
            } else if (proposal.entity_kind === "bank_account") {
              const method = stringField(payload, "paymentMethodRaw") ?? "RiseUp bank account";
              const identifier = stringField(payload, "paymentIdentifierRaw");
              const created = await tx.bank_accounts.create({
                data: {
                  id: crypto.randomUUID(),
                  household_id: householdId,
                  account_name: method,
                  bank_name: method,
                  account_number: identifier,
                  notes: "Draft created from RiseUp import proposal. Please review details.",
                },
              });
              targetEntityId = created.id;
              applied = true;
            } else if (proposal.entity_kind === "credit_card") {
              const method = stringField(payload, "paymentMethodRaw") ?? "RiseUp credit card";
              const identifier = stringField(payload, "paymentIdentifierRaw") ?? "";
              const digits = identifier.replace(/\D/g, "");
              const created = await tx.credit_cards.create({
                data: {
                  id: crypto.randomUUID(),
                  household_id: householdId,
                  card_name: method,
                  scheme: "other",
                  issuer_name: method,
                  card_last_four: digits.slice(-4) || identifier.slice(-4) || "0000",
                  notes: "Draft created from RiseUp import proposal. Please review details.",
                },
              });
              targetEntityId = created.id;
              applied = true;
            } else if (proposal.entity_kind === "subscription") {
              const name = stringField(payload, "suggestedName");
              const amount =
                numberField(payload, "perPaymentAmount") ?? numberField(payload, "amount");
              const billingIntervalRaw = stringField(payload, "billingInterval");
              const billing_interval =
                billingIntervalRaw === "annual" ? "annual" : "monthly";
              const familyMemberId = stringField(payload, "familyMemberId");
              const jobId = stringField(payload, "jobId");
              if (name && amount !== null && amount > 0) {
                const created = await tx.subscriptions.create({
                  data: {
                    id: crypto.randomUUID(),
                    household_id: householdId,
                    name,
                    fee_amount: amount,
                    billing_interval,
                    family_member_id:
                      familyMemberId &&
                      (await tx.family_members.findFirst({
                        where: { id: familyMemberId, household_id: householdId },
                      }))
                        ? familyMemberId
                        : null,
                    job_id:
                      jobId &&
                      (await tx.jobs.findFirst({
                        where: { id: jobId, household_id: householdId },
                      }))
                        ? jobId
                        : null,
                    description: [
                      "Draft created from RiseUp import proposal. Please review details.",
                      stringField(payload, "reason"),
                      payload.isActive === true ? "Status: ongoing in export window." : null,
                      payload.annualFamilyMembers
                        ? `Annual seats detected: ${String(payload.annualFamilyMembers)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" "),
                  },
                });
                targetEntityId = created.id;
                applied = true;
              }
            } else if (proposal.entity_kind === "savings_policy") {
              const name = stringField(payload, "suggestedName");
              const amount = numberField(payload, "amountPattern");
              if (name) {
                const created = await tx.savings_policies.create({
                  data: {
                    id: crypto.randomUUID(),
                    household_id: householdId,
                    provider_name: name,
                    policy_name: name,
                    monthly_contribution: amount && amount > 0 ? amount : null,
                    notes: "Draft created from RiseUp import proposal. Please review details.",
                  },
                });
                targetEntityId = created.id;
                applied = true;
              }
            }
          }

          const genericLinkKinds = new Set([
            "property_utility",
            "insurance_policy",
            "donation",
            "savings_policy",
            "digital_payment_method",
          ]);
          if (targetEntityId && genericLinkKinds.has(proposal.entity_kind)) {
            for (const support of proposal.supporting_transactions) {
              let transactionId = support.transaction_id;
              if (!transactionId && support.riseup_import_key) {
                const txMatch = await tx.transactions.findFirst({
                  where: {
                    household_id: householdId,
                    riseup_import_key: support.riseup_import_key,
                  },
                  select: { id: true },
                });
                transactionId = txMatch?.id ?? null;
              }
              if (!transactionId) continue;
              await tx.transaction_entity_links.upsert({
                where: {
                  household_id_transaction_id_entity_kind_entity_id: {
                    household_id: householdId,
                    transaction_id: transactionId,
                    entity_kind: proposal.entity_kind,
                    entity_id: targetEntityId,
                  },
                },
                update: {
                  confidence: support.confidence,
                  import_audit_id: importAuditId,
                  proposal_id: proposal.id,
                },
                create: {
                  id: crypto.randomUUID(),
                  household_id: householdId,
                  transaction_id: transactionId,
                  entity_kind: proposal.entity_kind,
                  entity_id: targetEntityId,
                  source: "riseup_import",
                  confidence: support.confidence,
                  import_audit_id: importAuditId,
                  proposal_id: proposal.id,
                },
              });
              proposalLinksCreated++;
            }
          }

          await tx.riseup_import_proposals.update({
            where: { id: proposal.id },
            data: {
              status: applied ? "applied" : "approved",
              target_entity_id: targetEntityId,
              import_audit_id: importAuditId,
              decision_notes: applied
                ? "Applied during RiseUp import commit."
                : "Approved but requires additional details before applying.",
            },
          });
          if (applied) proposalsApplied++;
        }
      }

      await tx.riseup_import_audits.create({
        data: {
          id: importAuditId,
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
      skippedExisting,
      skippedByUser,
      changedRows,
      ambiguousRows,
      proposalsApproved,
      proposalsApplied,
      proposalLinksCreated,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Commit failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
