import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRiseUpPatterns } from "./riseup-patterns";
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

test("classifies recurring income, loans, installments, and petrol patterns", () => {
  const rows = [
    row({
      rowIndex: 10,
      businessName: "משכורת דיסקונט",
      amount: 21000,
      transactionDirection: "credit",
      cashflowCategory: "הכנסות קבועות",
      paymentDate: "2026-05-01",
    }),
    row({
      rowIndex: 11,
      businessName: "משכורת דיסקונט",
      amount: 21500,
      transactionDirection: "credit",
      cashflowCategory: "הכנסות קבועות",
      paymentDate: "2026-06-01",
    }),
    row({
      rowIndex: 12,
      businessName: "בנק הפועלים",
      amount: -2000,
      cashflowCategory: "הלוואה",
      paymentDate: "2026-05-10",
    }),
    row({
      rowIndex: 13,
      businessName: "בנק הפועלים",
      amount: -2000,
      cashflowCategory: "הלוואה",
      paymentDate: "2026-06-10",
    }),
    row({
      rowIndex: 14,
      businessName: "פז אפליקציה יילו",
      amount: -280,
      cashflowCategory: "רכב",
      paymentDate: "2026-05-12",
    }),
    row({
      rowIndex: 15,
      businessName: "פז אפליקציה יילו",
      amount: -300,
      cashflowCategory: "רכב",
      paymentDate: "2026-06-12",
    }),
    row({
      rowIndex: 16,
      businessName: "כלל ביטוח חובה",
      amount: -1781,
      originalAmount: -3562,
      cashflowCategory: "תשלומים",
      paymentDate: "2026-05-15",
      raw: { "מספר התשלום": "1", "מספר תשלומים כולל": "2" },
    }),
  ];

  const patterns = analyzeRiseUpPatterns(rows);

  assert.ok(patterns.some((p) => p.kind === "work_income" && p.title === "משכורת דיסקונט"));
  assert.ok(patterns.some((p) => p.kind === "loan_return" && p.title === "בנק הפועלים"));
  assert.ok(patterns.some((p) => p.kind === "petrol" && p.title === "פז אפליקציה יילו"));
  assert.ok(patterns.some((p) => p.kind === "installment_or_annual" && p.title === "כלל ביטוח חובה"));
});

test("generates subscription proposals with actual totals and active-month rules", () => {
  const rows = [
    row({
      rowIndex: 30,
      businessName: "PAYPAL *CANVAPTYLIM",
      paymentDate: "2024-12-05",
      amount: -55.93,
      cashflowCategory: "דיגיטל",
    }),
    row({
      rowIndex: 31,
      businessName: "PAYPAL *CANVAPTYLIM",
      paymentDate: "2025-01-05",
      amount: -56.53,
      cashflowCategory: "הוצאות משתנות",
    }),
    row({
      rowIndex: 32,
      businessName: "OPENAI",
      paymentDate: "2026-04-22",
      amount: -30.41,
      cashflowCategory: "הוצאות משתנות",
    }),
    row({
      rowIndex: 33,
      businessName: "CURSOR AI POWERED IDE",
      paymentDate: "2026-06-16",
      amount: -59.06,
      cashflowCategory: "דיגיטל",
    }),
  ];
  const proposals = generateRiseUpImportProposals(rows);
  const canva = proposals.find((p) => p.entity_kind === "subscription" && /canva/i.test(p.title));
  const openai = proposals.find((p) => p.entity_kind === "subscription" && /openai/i.test(p.title));
  const cursor = proposals.find((p) => p.entity_kind === "subscription" && /cursor/i.test(p.title));

  assert.ok(canva);
  assert.equal(canva.payload_json.totalPaidInExport, 112.46);
  assert.equal(canva.payload_json.yearlyTotalAmount, 112.46);
  assert.equal(canva.payload_json.isActive, false);

  assert.ok(openai);
  assert.equal(openai.payload_json.yearlyTotalAmount, 30.41);

  assert.ok(cursor);
  assert.equal(cursor.payload_json.isActive, true);
  assert.equal(cursor.payload_json.endDate, "ongoing");
});

test("uses cross-row patterns to create reviewed durable entity proposals", () => {
  const rows = [
    row({
      rowIndex: 20,
      businessName: "משכורת דיסקונט",
      amount: 21000,
      transactionDirection: "credit",
      cashflowCategory: "הכנסות קבועות",
      paymentDate: "2026-05-01",
    }),
    row({
      rowIndex: 21,
      businessName: "משכורת דיסקונט",
      amount: 21500,
      transactionDirection: "credit",
      cashflowCategory: "הכנסות קבועות",
      paymentDate: "2026-06-01",
    }),
  ];
  const patterns = analyzeRiseUpPatterns(rows);
  const proposals = generateRiseUpImportProposals(rows, patterns);

  assert.ok(
    proposals.some(
      (p) =>
        p.entity_kind === "job" &&
        p.payload_json.patternKind === "work_income" &&
        p.supportRows.length === 2,
    ),
  );
});
