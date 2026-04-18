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

test("org monthly profile links receipt allocations to monthly treatments", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzeOrgProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      תכנית: "ארגון א",
      "סוג ביקור": "ביקור בית",
      מטופל: "מאור",
      סכום: "100",
      תאריך: "15/03/2026",
      קבלה: "",
      "תאריך תשלום": "",
      "דרך תשלום": "",
      הערות: "",
    },
    {
      תכנית: "ארגון א",
      "סוג ביקור": "ייעוץ טלפוני",
      מטופל: "מאור",
      סכום: "200",
      תאריך: "22/03/2026",
      קבלה: "",
      "תאריך תשלום": "",
      "דרך תשלום": "",
      הערות: "",
    },
    {
      תכנית: "תשלום",
      "סוג ביקור": "",
      מטופל: "",
      סכום: "300",
      תאריך: "מרץ 2026",
      קבלה: "1234",
      "תאריך תשלום": "31/03/2026",
      "דרך תשלום": "ביט",
      הערות: "",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");

  const params = {
    householdId: "hh-1",
    jobId: "job-1",
    selectedProgramId: null,
    profile: "tipulim_org_monthly",
    workbook,
    sheetName: "Sheet1",
  } as const;

  const scratch = await analyzeOrgProfileForTest(params, {
    isPrivateClinic: false,
    clients: [{ id: "c-1", first_name: "מאור", last_name: null }],
    programsByJob: [{ id: "p-1", name: "ארגון א", job_id: "job-1" }],
    bankAccounts: [],
    digitalMethods: [{ id: "dm-1", name: "ביט" }],
  });

  assert.equal(scratch.errors.length, 0);
  assert.equal(scratch.pendingReceipts.length, 1);
  assert.equal(scratch.pendingTreatments.size, 2);
  assert.equal(scratch.pendingReceipts[0]?.allocations.length, 2);
  assert.equal(
    scratch.pendingReceipts[0]?.allocations.reduce((sum, a) => sum + Number(a.amount), 0),
    300,
  );
});

test("org monthly profile links allocations for short visit labels (בית/טלפון)", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzeOrgProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      תכנית: "ארגון א",
      "סוג ביקור": "בית",
      מטופל: "מאור",
      סכום: "120",
      תאריך: "15/03/2026",
      קבלה: "",
      "תאריך תשלום": "",
      "דרך תשלום": "",
      הערות: "",
    },
    {
      תכנית: "ארגון א",
      "סוג ביקור": "טלפון",
      מטופל: "מאור",
      סכום: "180",
      תאריך: "22/03/2026",
      קבלה: "",
      "תאריך תשלום": "",
      "דרך תשלום": "",
      הערות: "",
    },
    {
      תכנית: "תשלום",
      "סוג ביקור": "",
      מטופל: "",
      סכום: "300",
      תאריך: "מרץ 2026",
      קבלה: "5566",
      "תאריך תשלום": "31/03/2026",
      "דרך תשלום": "ביט",
      הערות: "",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");

  const params = {
    householdId: "hh-1",
    jobId: "job-1",
    selectedProgramId: null,
    profile: "tipulim_org_monthly",
    workbook,
    sheetName: "Sheet1",
  } as const;

  const scratch = await analyzeOrgProfileForTest(params, {
    isPrivateClinic: false,
    clients: [{ id: "c-1", first_name: "מאור", last_name: null }],
    programsByJob: [{ id: "p-1", name: "ארגון א", job_id: "job-1" }],
    bankAccounts: [],
    digitalMethods: [{ id: "dm-1", name: "ביט" }],
  });

  assert.equal(scratch.errors.length, 0);
  assert.equal(scratch.pendingTreatments.size, 2);
  assert.equal(scratch.pendingReceipts.length, 1);
  assert.equal(scratch.pendingReceipts[0]?.allocations.length, 2);
});

test("org monthly profile uses sole job program when program column is empty", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzeOrgProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      תכנית: "",
      "סוג ביקור": "ביקור בית",
      מטופל: "מאור",
      סכום: "100",
      תאריך: "15/03/2026",
      קבלה: "",
      "תאריך תשלום": "",
      "דרך תשלום": "",
      הערות: "",
    },
    {
      תכנית: "",
      "סוג ביקור": "ייעוץ טלפוני",
      מטופל: "מאור",
      סכום: "200",
      תאריך: "22/03/2026",
      קבלה: "",
      "תאריך תשלום": "",
      "דרך תשלום": "",
      הערות: "",
    },
    {
      תכנית: "תשלום",
      "סוג ביקור": "",
      מטופל: "",
      סכום: "300",
      תאריך: "מרץ 2026",
      קבלה: "1234",
      "תאריך תשלום": "31/03/2026",
      "דרך תשלום": "ביט",
      הערות: "",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");

  const params = {
    householdId: "hh-1",
    jobId: "job-1",
    selectedProgramId: null,
    profile: "tipulim_org_monthly",
    workbook,
    sheetName: "Sheet1",
  } as const;

  const scratch = await analyzeOrgProfileForTest(params, {
    isPrivateClinic: false,
    clients: [{ id: "c-1", first_name: "מאור", last_name: null }],
    programsByJob: [{ id: "p-1", name: "ארגון א", job_id: "job-1" }],
    bankAccounts: [],
    digitalMethods: [{ id: "dm-1", name: "ביט" }],
  });

  assert.equal(scratch.errors.length, 0);
  assert.equal(scratch.pendingTreatments.size, 2);
  const treatments = Array.from(scratch.pendingTreatments.values());
  assert.ok(treatments.every((t) => t.programName === "ארגון א"));
  assert.equal(scratch.warnings.length, 1);
  assert.ok(scratch.warnings[0]?.includes("Empty program column"));
  assert.equal(scratch.pendingReceipts.length, 1);
  assert.equal(scratch.pendingReceipts[0]?.allocations.length, 2);
});

test("org monthly profile links allocations when payment row appears last", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzeOrgProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      תכנית: "ארגון א",
      "סוג ביקור": "ביקור בית",
      מטופל: "מאור",
      סכום: "100",
      תאריך: "10/03/2026",
      קבלה: "",
      "תאריך תשלום": "",
      "דרך תשלום": "",
      הערות: "",
    },
    {
      תכנית: "ארגון א",
      "סוג ביקור": "ייעוץ טלפוני",
      מטופל: "מאור",
      סכום: "200",
      תאריך: "20/03/2026",
      קבלה: "",
      "תאריך תשלום": "",
      "דרך תשלום": "",
      הערות: "",
    },
    {
      תכנית: "תשלום",
      "סוג ביקור": "",
      מטופל: "",
      סכום: "300",
      תאריך: "מרץ 2026",
      קבלה: "7781",
      "תאריך תשלום": "31/03/2026",
      "דרך תשלום": "ביט",
      הערות: "",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");

  const params = {
    householdId: "hh-1",
    jobId: "job-1",
    selectedProgramId: null,
    profile: "tipulim_org_monthly",
    workbook,
    sheetName: "Sheet1",
  } as const;

  const scratch = await analyzeOrgProfileForTest(params, {
    isPrivateClinic: false,
    clients: [{ id: "c-1", first_name: "מאור", last_name: null }],
    programsByJob: [{ id: "p-1", name: "ארגון א", job_id: "job-1" }],
    bankAccounts: [],
    digitalMethods: [{ id: "dm-1", name: "ביט" }],
  });

  assert.equal(scratch.errors.length, 0);
  assert.equal(scratch.pendingReceipts.length, 1);
  assert.equal(scratch.pendingReceipts[0]?.allocations.length, 2);
});

test("private profile blocks receipt anchor when no treatments can be linked", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzePrivateProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      קבלה: "9001",
      "תאריך תשלום": "2026-04-10",
      שולם: "400",
      סכום: "",
      מטופל: "",
      תאריך: "2026-04-10",
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

  assert.ok(scratch.errors.some((e) => e.includes("could not be linked to any treatments")));
  assert.equal(scratch.pendingReceipts.length, 0);
});

test("org monthly profile blocks payment receipt when month has no linked treatments", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
  const { analyzeOrgProfileForTest } = await import("@/lib/therapy/import-tipulim");

  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      תכנית: "תשלום",
      "סוג ביקור": "",
      מטופל: "",
      סכום: "500",
      תאריך: "אפריל 2026",
      קבלה: "7788",
      "תאריך תשלום": "30/04/2026",
      "דרך תשלום": "ביט",
      הערות: "",
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Sheet1");

  const params = {
    householdId: "hh-1",
    jobId: "job-1",
    selectedProgramId: null,
    profile: "tipulim_org_monthly",
    workbook,
    sheetName: "Sheet1",
  } as const;

  const scratch = await analyzeOrgProfileForTest(params, {
    isPrivateClinic: false,
    clients: [],
    programsByJob: [{ id: "p-1", name: "ארגון א", job_id: "job-1" }],
    bankAccounts: [],
    digitalMethods: [{ id: "dm-1", name: "ביט" }],
  });

  assert.ok(scratch.errors.some((e) => e.includes("could not be linked to any treatments")));
  assert.equal(scratch.pendingReceipts.length, 0);
});
