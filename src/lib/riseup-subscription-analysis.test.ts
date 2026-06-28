import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeRiseUpSubscriptions,
  analyzeSubscriptionCluster,
  canonicalSubscriptionName,
  getExportActiveMonth,
  isPaidInExportActiveMonth,
  patternEndedDuringExport,
  type SubscriptionAnalysisRow,
} from "./riseup-subscription-analysis";

function subRow(partial: Partial<SubscriptionAnalysisRow> & { rowIndex: number }): SubscriptionAnalysisRow {
  return {
    rowIndex: partial.rowIndex,
    riseup_import_key: partial.riseup_import_key ?? `key:${partial.rowIndex}`,
    businessName: partial.businessName ?? "Merchant",
    paymentDate: partial.paymentDate ?? "2026-06-01",
    amount: partial.amount ?? -50,
    originalAmount: partial.originalAmount ?? null,
    cashflowCategory: partial.cashflowCategory ?? "דיגיטל",
    paymentMethodRaw: partial.paymentMethodRaw ?? "cal",
    paymentIdentifierRaw: partial.paymentIdentifierRaw ?? "5109",
    raw: partial.raw ?? {},
    subscriptionSelectedId: partial.subscriptionSelectedId ?? null,
  };
}

test("canonicalSubscriptionName merges Claude and Anthropic merchants", () => {
  assert.equal(canonicalSubscriptionName("CLAUDE.AI SUBSCRIPTION"), "Claude AI");
  assert.equal(canonicalSubscriptionName("ANTHROPIC* CLAUDE SUB"), "Claude AI");
});

test("active month treats June 2026 payment as ongoing", () => {
  const rows = [
    exportWindowAnchorRow(99),
    subRow({ rowIndex: 0, businessName: "CURSOR AI POWERED IDE", paymentDate: "2026-06-16", amount: -60 }),
  ];
  const activeMonth = getExportActiveMonth(rows);
  assert.equal(activeMonth, "2026-06");
  const [analysis] = analyzeRiseUpSubscriptions(rows);
  assert.ok(analysis);
  assert.equal(analysis.isActive, true);
  assert.equal(analysis.endDate, "ongoing");
});

function exportWindowAnchorRow(rowIndex: number): SubscriptionAnalysisRow {
  return subRow({
    rowIndex,
    businessName: "שופרסל דיל",
    paymentDate: "2026-06-01",
    amount: -10,
    cashflowCategory: "סופר",
  });
}

test("Canva uses actual export total for two monthly payments, not projected annual", () => {
  const rows = [
    exportWindowAnchorRow(99),
    subRow({
      rowIndex: 0,
      businessName: "PAYPAL *CANVAPTYLIM",
      paymentDate: "2024-12-05",
      amount: -55.93,
      cashflowCategory: "דיגיטל",
    }),
    subRow({
      rowIndex: 1,
      businessName: "PAYPAL *CANVAPTYLIM",
      paymentDate: "2025-01-05",
      amount: -56.53,
      cashflowCategory: "הוצאות משתנות",
    }),
  ];
  const [analysis] = analyzeRiseUpSubscriptions(rows);
  assert.ok(analysis);
  assert.equal(analysis.frequency, "monthly");
  assert.equal(analysis.paymentCount, 2);
  assert.equal(analysis.totalPaidInExport, 112.46);
  assert.equal(analysis.yearlyTotalAmount, 112.46);
  assert.equal(analysis.isActive, false);
  assert.equal(analysis.endDate, "2025-01-05");
});

test("OpenAI single payment uses actual total only", () => {
  const rows = [
    exportWindowAnchorRow(99),
    subRow({
      rowIndex: 0,
      businessName: "OPENAI",
      paymentDate: "2026-04-22",
      amount: -30.41,
      cashflowCategory: "הוצאות משתנות",
    }),
  ];
  const [analysis] = analyzeRiseUpSubscriptions(rows);
  assert.ok(analysis);
  assert.equal(analysis.totalPaidInExport, 30.41);
  assert.equal(analysis.yearlyTotalAmount, 30.41);
  assert.equal(analysis.isActive, false);
});

test("Zoom detects dual annual family members", () => {
  const rows = [
    subRow({ rowIndex: 0, businessName: "ZOOM.US 888-799-9666", paymentDate: "2024-09-26", amount: -560.37 }),
    subRow({ rowIndex: 1, businessName: "PAYPAL *ZOOMCOMM", paymentDate: "2025-07-06", amount: -551.05 }),
    subRow({ rowIndex: 2, businessName: "ZOOM.COM 888-799-966", paymentDate: "2025-09-25", amount: -544.67 }),
  ];
  const [analysis] = analyzeRiseUpSubscriptions(rows);
  assert.ok(analysis);
  assert.equal(analysis.frequency, "yearly");
  assert.equal(analysis.annualFamilyMembers, 2);
  assert.equal(analysis.totalPaidInExport, 1656.09);
  assert.equal(analysis.yearlyTotalAmount, 1104.06);
});

test("active monthly subscription projects yearly run-rate", () => {
  const rows = [
    exportWindowAnchorRow(99),
    subRow({ rowIndex: 0, businessName: "Google YouTubePremium", paymentDate: "2026-04-04", amount: -23.9 }),
    subRow({ rowIndex: 1, businessName: "Google YouTubePremium", paymentDate: "2026-05-04", amount: -23.9 }),
    subRow({ rowIndex: 2, businessName: "Google YouTubePremium", paymentDate: "2026-06-04", amount: -23.9 }),
  ];
  const [analysis] = analyzeRiseUpSubscriptions(rows);
  assert.ok(analysis);
  assert.equal(analysis.isActive, true);
  assert.equal(analysis.yearlyTotalAmount, 286.8);
  assert.equal(analysis.totalPaidInExport, 71.7);
});

test("patternEndedDuringExport is false when paid in export last month", () => {
  assert.equal(
    patternEndedDuringExport("2026-06", "2026-06", isPaidInExportActiveMonth("2026-06-16", "2026-06")),
    false,
  );
  assert.equal(
    patternEndedDuringExport("2026-05", "2026-06", isPaidInExportActiveMonth("2026-05-27", "2026-06")),
    true,
  );
});

test("installment plans are excluded from subscription analysis", () => {
  const rows = [
    subRow({
      rowIndex: 0,
      businessName: "תקוה ומרפא",
      paymentDate: "2026-06-05",
      amount: -72,
      cashflowCategory: "תרומה",
      raw: { "מספר התשלום": "10", "מספר תשלומים כולל": "12" },
    }),
  ];
  assert.equal(analyzeRiseUpSubscriptions(rows).length, 0);
});

test("analyzeSubscriptionCluster returns null for excluded donations category", () => {
  const analysis = analyzeSubscriptionCluster(
    [
      subRow({
        rowIndex: 0,
        businessName: "Some Shop",
        paymentDate: "2026-05-01",
        cashflowCategory: "תרומה",
      }),
      subRow({
        rowIndex: 1,
        businessName: "Some Shop",
        paymentDate: "2026-06-01",
        cashflowCategory: "תרומה",
      }),
    ],
    "2026-06",
  );
  assert.equal(analysis, null);
});
