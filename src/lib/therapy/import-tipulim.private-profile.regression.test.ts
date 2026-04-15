import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";

test("private profile links receipt allocations despite receipt formatting differences", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzePrivateProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      קבלה: "00123.0",
      "תאריך תשלום": "",
      שולם: "",
      סכום: "100",
      מטופל: "דנה",
      תאריך: "2026-01-10",
      "סוג ביקור": "בית",
      הערות: "",
      "דרך תשלום": "",
    },
    {
      קבלה: "123",
      "תאריך תשלום": "2026-01-15",
      שולם: "100",
      סכום: "",
      מטופל: "",
      תאריך: "2026-01-15",
      "סוג ביקור": "",
      הערות: "",
      "דרך תשלום": "ביט",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");

  const params = {
    householdId: "hh-1",
    jobId: "job-1",
    selectedProgramId: null,
    profile: "tipulim_private",
    workbook,
    sheetName: "Sheet1",
  } as const;

  const scratch = await analyzePrivateProfileForTest(params, {
    isPrivateClinic: true,
    clients: [{ id: "c-1", first_name: "דנה", last_name: null }],
    programsByJob: [],
    bankAccounts: [],
    digitalMethods: [{ id: "dm-1", name: "ביט" }],
  });

  assert.equal(scratch.errors.length, 0);
  assert.equal(scratch.pendingReceipts.length, 1);

  const receipt = scratch.pendingReceipts[0];
  assert.ok(receipt);
  assert.equal(receipt!.receiptNumber, "123");
  assert.equal(receipt!.allocations.length, 1);

  const treatment = Array.from(scratch.pendingTreatments.values())[0];
  assert.ok(treatment);
  assert.ok(treatment!.paymentDate);
  assert.equal(treatment!.paymentMethod, "digital_payment");
});

test("private profile links receipt allocations when treatment receipt has apostrophe and anchor has #", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzePrivateProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      קבלה: "'000456/26",
      "תאריך תשלום": "",
      שולם: "",
      סכום: "220",
      מטופל: "דנה",
      תאריך: "2026-02-03",
      "סוג ביקור": "בית",
      הערות: "",
      "דרך תשלום": "",
    },
    {
      קבלה: "#456/26",
      "תאריך תשלום": "2026-02-20",
      שולם: "220",
      סכום: "",
      מטופל: "",
      תאריך: "2026-02-20",
      "סוג ביקור": "",
      הערות: "",
      "דרך תשלום": "ביט",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");

  const params = {
    householdId: "hh-1",
    jobId: "job-1",
    selectedProgramId: null,
    profile: "tipulim_private",
    workbook,
    sheetName: "Sheet1",
  } as const;

  const scratch = await analyzePrivateProfileForTest(params, {
    isPrivateClinic: true,
    clients: [{ id: "c-1", first_name: "דנה", last_name: null }],
    programsByJob: [],
    bankAccounts: [],
    digitalMethods: [{ id: "dm-1", name: "ביט" }],
  });

  assert.equal(scratch.errors.length, 0);
  assert.equal(scratch.pendingReceipts.length, 1);
  assert.equal(scratch.pendingReceipts[0]?.allocations.length, 1);
  const treatment = Array.from(scratch.pendingTreatments.values())[0];
  assert.ok(treatment?.paymentDate);
});

test("private profile links receipt allocations with hidden RTL markers and spacing differences", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzePrivateProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      קבלה: "\u200F  000789 / 26",
      "תאריך תשלום": "",
      שולם: "",
      סכום: "180",
      מטופל: "דנה",
      תאריך: "2026-03-03",
      "סוג ביקור": "בית",
      הערות: "",
      "דרך תשלום": "",
    },
    {
      קבלה: "#789/26",
      "תאריך תשלום": "2026-03-25",
      שולם: "180",
      סכום: "",
      מטופל: "",
      תאריך: "2026-03-25",
      "סוג ביקור": "",
      הערות: "",
      "דרך תשלום": "ביט",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");

  const params = {
    householdId: "hh-1",
    jobId: "job-1",
    selectedProgramId: null,
    profile: "tipulim_private",
    workbook,
    sheetName: "Sheet1",
  } as const;

  const scratch = await analyzePrivateProfileForTest(params, {
    isPrivateClinic: true,
    clients: [{ id: "c-1", first_name: "דנה", last_name: null }],
    programsByJob: [],
    bankAccounts: [],
    digitalMethods: [{ id: "dm-1", name: "ביט" }],
  });

  assert.equal(scratch.errors.length, 0);
  assert.equal(scratch.pendingReceipts.length, 1);
  assert.equal(scratch.pendingReceipts[0]?.allocations.length, 1);
});

test("private profile infers allocations when receipt number exists only on anchor row", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzePrivateProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      קבלה: "0149",
      "תאריך תשלום": "",
      שולם: "300",
      סכום: "",
      מטופל: "מאור",
      תאריך: "2026-01-14",
      "סוג ביקור": "",
      הערות: "",
      "דרך תשלום": "העברה לחשבון 506018",
    },
    {
      קבלה: "",
      "תאריך תשלום": "2026-01-14",
      שולם: "",
      סכום: "150",
      מטופל: "מאור",
      תאריך: "2026-01-08",
      "סוג ביקור": "וידאו",
      הערות: "",
      "דרך תשלום": "",
    },
    {
      קבלה: "",
      "תאריך תשלום": "2026-01-14",
      שולם: "",
      סכום: "150",
      מטופל: "מאור",
      תאריך: "2025-12-20",
      "סוג ביקור": "וידאו",
      הערות: "",
      "דרך תשלום": "",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");

  const params = {
    householdId: "hh-1",
    jobId: "job-1",
    selectedProgramId: null,
    profile: "tipulim_private",
    workbook,
    sheetName: "Sheet1",
  } as const;

  const scratch = await analyzePrivateProfileForTest(params, {
    isPrivateClinic: true,
    clients: [{ id: "c-1", first_name: "מאור", last_name: null }],
    programsByJob: [],
    bankAccounts: [{ id: "ba-1", account_number: "506018" }],
    digitalMethods: [],
  });

  assert.equal(scratch.errors.length, 0);
  assert.equal(scratch.pendingReceipts.length, 1);
  assert.equal(scratch.pendingReceipts[0]?.allocations.length, 2);
  const treatments = Array.from(scratch.pendingTreatments.values());
  assert.equal(treatments.length, 2);
  assert.ok(treatments.every((t) => !!t.paymentDate));
  assert.ok(treatments.every((t) => t.paymentMethod === "bank_transfer"));
});
