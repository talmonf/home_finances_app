import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRiseUpImportDraftState,
  collectRiseUpPaymentMonths,
  filterRiseUpImportRows,
  isHighConfidenceNewRiseUpRow,
  mergeRiseUpImportDraft,
  parseRiseUpImportDraftState,
  restoreProposalDraftDecisions,
  riseUpPaymentMonth,
} from "./riseup-import-draft";

const sampleRow = {
  rowIndex: 0,
  riseup_import_key: "key-a",
  paymentDate: "2026-06-15",
  importStatus: "new" as const,
  needsReview: false,
  isZeroAmountPending: false,
};

test("extracts payment month from ISO dates", () => {
  assert.equal(riseUpPaymentMonth("2026-06-15"), "2026-06");
  assert.deepEqual(
    collectRiseUpPaymentMonths([{ paymentDate: "2026-05-01" }, { paymentDate: "2026-06-02" }]),
    ["2026-06", "2026-05"],
  );
});

test("detects high-confidence new rows", () => {
  assert.equal(isHighConfidenceNewRiseUpRow(sampleRow), true);
  assert.equal(isHighConfidenceNewRiseUpRow({ ...sampleRow, needsReview: true }), false);
});

test("merges draft actions by import key", () => {
  const merged = mergeRiseUpImportDraft({
    rows: [sampleRow, { ...sampleRow, rowIndex: 1, riseup_import_key: "key-b" }],
    defaultActions: { 0: "create", 1: "create" },
    defaultOverrides: {
      0: {
        bank_account_id: null,
        credit_card_id: null,
        payee_id: null,
        new_payee_name: "",
        category_id: null,
        job_id: null,
        subscription_id: null,
        loan_id: null,
      },
      1: {
        bank_account_id: null,
        credit_card_id: null,
        payee_id: "payee-1",
        new_payee_name: "",
        category_id: null,
        job_id: null,
        subscription_id: null,
        loan_id: null,
      },
    },
    draft: {
      version: 1,
      fileName: "export.csv",
      fileContentHash: "abc",
      rowCount: 2,
      rowActions: { "key-a": "skip" },
      rowOverrides: {
        "key-b": {
          bank_account_id: null,
          credit_card_id: null,
          payee_id: "payee-2",
          new_payee_name: "",
          category_id: null,
          job_id: null,
          subscription_id: null,
          loan_id: null,
        },
      },
      proposalActions: {},
      proposalWorkExpense: {},
    },
  });

  assert.equal(merged.actions[0], "skip");
  assert.equal(merged.overrides[1]?.payee_id, "payee-2");
  assert.ok(merged.restoredRowCount > 0);
});

test("stores proposal decisions by clientKey and restores by id", () => {
  const draft = buildRiseUpImportDraftState({
    fileName: "export.csv",
    fileContentHash: "abc",
    rows: [{ rowIndex: 0, riseup_import_key: "key-a" }],
    actions: { 0: "skip" },
    overrides: {
      0: {
        bank_account_id: null,
        credit_card_id: null,
        payee_id: null,
        new_payee_name: "",
        category_id: null,
        job_id: null,
        subscription_id: null,
        loan_id: null,
      },
    },
    proposalActions: { "proposal-1": "approve" },
    proposalWorkExpense: {
      "proposal-1": { isWorkExpense: true, familyMemberId: "fm-1", jobId: "job-1" },
    },
    proposals: [{ id: "proposal-1", clientKey: "subscription:claude:30.00" }],
  });

  assert.equal(draft.proposalActions["subscription:claude:30.00"], "approve");

  const restored = restoreProposalDraftDecisions(
    [{ id: "new-id", clientKey: "subscription:claude:30.00" }],
    draft,
  );
  assert.equal(restored.proposalActions["new-id"], "approve");
  assert.equal(restored.proposalWorkExpense["new-id"]?.jobId, "job-1");
});

test("filters rows by month, status, and needs review", () => {
  const rows = [
    sampleRow,
    {
      ...sampleRow,
      rowIndex: 1,
      riseup_import_key: "key-b",
      paymentDate: "2026-05-01",
      importStatus: "existing" as const,
      needsReview: true,
    },
  ];
  assert.equal(
    filterRiseUpImportRows(rows, {
      month: "2026-06",
      importStatus: "all",
      needsReviewOnly: false,
    }).length,
    1,
  );
  assert.equal(
    filterRiseUpImportRows(rows, {
      month: "all",
      importStatus: "existing",
      needsReviewOnly: true,
    }).length,
    1,
  );
});

test("parses persisted draft JSON", () => {
  const parsed = parseRiseUpImportDraftState({
    version: 1,
    fileName: "export.csv",
    fileContentHash: "abc",
    rowCount: 1,
    rowActions: { "key-a": "create" },
    rowOverrides: {},
    proposalActions: {},
    proposalWorkExpense: {},
    txFilters: { month: "2026-06", importStatus: "new", needsReviewOnly: true },
  });
  assert.equal(parsed?.txFilters?.month, "2026-06");
});
