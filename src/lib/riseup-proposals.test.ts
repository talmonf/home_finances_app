import test from "node:test";
import assert from "node:assert/strict";
import { generateRiseUpImportProposals } from "./riseup-proposals";
import type { RiseUpAnalyzedRow } from "./riseup-matching";

function emptyMatch() {
  return {
    candidates: [],
    selectedId: null,
    selectedConfidence: null,
  };
}

function row(partial: Partial<RiseUpAnalyzedRow> & { rowIndex: number }): RiseUpAnalyzedRow & {
  riseup_import_key: string;
  importStatus: string;
} {
  return {
    rowIndex: partial.rowIndex,
    businessName: partial.businessName ?? "Merchant",
    paymentMethodRaw: partial.paymentMethodRaw ?? "cal",
    paymentIdentifierRaw: partial.paymentIdentifierRaw ?? "2499",
    sourceKind: partial.sourceKind ?? "creditCard",
    paymentDate: partial.paymentDate ?? "2026-07-05",
    chargeDate: partial.chargeDate ?? null,
    amount: partial.amount ?? -50,
    originalAmount: partial.originalAmount ?? null,
    cashflowCategory: partial.cashflowCategory ?? "General",
    isZeroAmountPending: partial.isZeroAmountPending ?? false,
    raw: partial.raw ?? {},
    transactionDirection: partial.transactionDirection ?? "debit",
    instrument: partial.instrument ?? { ...emptyMatch(), kind: "credit_card" },
    payee: partial.payee ?? emptyMatch(),
    category: partial.category ?? emptyMatch(),
    job: partial.job ?? emptyMatch(),
    subscription: partial.subscription ?? emptyMatch(),
    loan: partial.loan ?? emptyMatch(),
    utility: partial.utility ?? emptyMatch(),
    insurance: partial.insurance ?? emptyMatch(),
    donation: partial.donation ?? emptyMatch(),
    digitalMethod: partial.digitalMethod ?? emptyMatch(),
    utilityCategoryHint: partial.utilityCategoryHint ?? null,
    needsReview: partial.needsReview ?? false,
    reviewReasons: partial.reviewReasons ?? [],
    riseup_import_key: `riseup:test:${partial.rowIndex}`,
    importStatus: "new",
  };
}

test("generates staged proposals for missing instruments and core mappings", () => {
  const proposals = generateRiseUpImportProposals([
    row({ rowIndex: 0, businessName: "New Shop", cashflowCategory: "Shopping" }),
    row({ rowIndex: 1, businessName: "New Shop", cashflowCategory: "Shopping" }),
  ]);

  assert.ok(proposals.some((p) => p.entity_kind === "credit_card"));
  assert.ok(proposals.some((p) => p.entity_kind === "payee"));
  assert.ok(proposals.some((p) => p.entity_kind === "category"));
});

test("generates domain proposals for recurring utility and donation rows", () => {
  const proposals = generateRiseUpImportProposals([
    row({
      rowIndex: 0,
      businessName: "Electric Company",
      cashflowCategory: "חשמל",
      utilityCategoryHint: "electricity",
      paymentDate: "2026-07-05",
    }),
    row({
      rowIndex: 1,
      businessName: "Electric Company",
      cashflowCategory: "חשמל",
      utilityCategoryHint: "electricity",
      paymentDate: "2026-08-05",
    }),
    row({
      rowIndex: 2,
      businessName: "Good Cause",
      cashflowCategory: "תרומה",
    }),
  ]);

  assert.ok(proposals.some((p) => p.entity_kind === "property_utility"));
  assert.ok(proposals.some((p) => p.entity_kind === "donation"));
});
