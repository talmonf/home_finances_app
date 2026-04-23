import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";

const receiptCtx = {
  isPrivateClinic: true,
  jobFamilyMemberId: null as string | null,
  clients: [{ id: "c-1", first_name: "Dana", last_name: "Cohen" }],
  programsByJob: [] as Array<{ id: string; name: string; job_id: string }>,
  bankAccounts: [] as Array<{ id: string; account_number: string | null }>,
  digitalMethods: [
    { id: "dm-1", name: "Bit", method_type: "bit" as const, family_member_id: null as string | null },
  ],
};

test("receipts-only import uses treatmentDate01 for treatment occurred_at, payment date unchanged", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzeReceiptOnlyProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      "Payment Date": "2026-03-10",
      Client: "Dana C",
      Amount: "400.00",
      "Receipt #": "R-1",
      Notes: "",
      "Payment method": "cash",
      treatmentDate01: "2026-03-01",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");

  const scratch = await analyzeReceiptOnlyProfileForTest(
    {
      householdId: "hh-1",
      jobId: "job-1",
      selectedProgramId: null,
      profile: "tipulim_receipts_only",
      workbook,
      sheetName: "Sheet1",
      missingVisitType: "clinic",
      usualTreatmentCost: "400.00",
    },
    receiptCtx,
  );

  assert.equal(scratch.errors.length, 0);
  assert.equal(scratch.pendingReceipts.length, 1);
  assert.equal(scratch.pendingTreatments.size, 1);
  const t = [...scratch.pendingTreatments.values()][0]!;
  assert.equal(t.occurredAt.toISOString().slice(0, 10), "2026-03-01");
  assert.equal(t.paymentDate?.toISOString().slice(0, 10), "2026-03-10");
});

test("receipts-only import splits amount across treatmentDate01 and treatmentDate02", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzeReceiptOnlyProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      "Payment Date": "2026-04-01",
      Client: "Dana C",
      Amount: "100.01",
      "Receipt #": "R-2",
      Notes: "",
      "Payment method": "cash",
      treatmentDate01: "2026-04-02",
      treatmentDate02: "2026-04-03",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");

  const scratch = await analyzeReceiptOnlyProfileForTest(
    {
      householdId: "hh-1",
      jobId: "job-1",
      selectedProgramId: null,
      profile: "tipulim_receipts_only",
      workbook,
      sheetName: "Sheet1",
      missingVisitType: "home",
      usualTreatmentCost: "100.00",
    },
    receiptCtx,
  );

  assert.equal(scratch.errors.length, 0);
  assert.equal(scratch.pendingTreatments.size, 2);
  const amounts = [...scratch.pendingTreatments.values()]
    .map((x) => x.amount)
    .sort();
  assert.deepEqual(amounts, ["50.00", "50.01"]);
  const receipt = scratch.pendingReceipts[0]!;
  assert.equal(receipt.allocations.length, 2);
  const sum = receipt.allocations.reduce((s, a) => s + Number(a.amount), 0);
  assert.ok(Math.abs(sum - 100.01) < 0.001);
});

test("receipts-only import blocks ambiguous text date when date format preference is auto", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzeReceiptOnlyProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      "Payment Date": "01-03-2026",
      Client: "Dana C",
      Amount: "80.00",
      "Receipt #": "R-3",
      Notes: "",
      "Payment method": "cash",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");

  const scratch = await analyzeReceiptOnlyProfileForTest(
    {
      householdId: "hh-1",
      jobId: "job-1",
      selectedProgramId: null,
      profile: "tipulim_receipts_only",
      workbook,
      sheetName: "Sheet1",
      missingVisitType: "clinic",
      usualTreatmentCost: "80.00",
      dateFormatPreference: "auto",
    },
    receiptCtx,
  );

  assert.ok(scratch.errors.some((e) => e.includes("ambiguous Payment Date")));
});
