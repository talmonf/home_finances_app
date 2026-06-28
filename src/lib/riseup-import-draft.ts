import { createHash } from "crypto";
import type {
  RiseUpImportAction,
  RiseUpImportRowStatus,
} from "@/lib/riseup-commit-types";

export const RISEUP_IMPORT_DRAFT_VERSION = 1;

export type RiseUpImportDraftRowOverride = {
  bank_account_id: string | null;
  credit_card_id: string | null;
  payee_id: string | null;
  new_payee_name: string;
  category_id: string | null;
  job_id: string | null;
  subscription_id: string | null;
  loan_id: string | null;
};

export type RiseUpImportDraftProposalWorkExpense = {
  isWorkExpense: boolean;
  familyMemberId: string;
  jobId: string;
};

export type RiseUpImportDraftTxFilters = {
  month: string;
  importStatus: RiseUpImportRowStatus | "all";
  needsReviewOnly: boolean;
};

export type RiseUpImportDraftState = {
  version: typeof RISEUP_IMPORT_DRAFT_VERSION;
  fileName: string;
  fileContentHash: string;
  rowCount: number;
  activeSection?: string;
  txFilters?: RiseUpImportDraftTxFilters;
  rowActions: Record<string, RiseUpImportAction>;
  rowOverrides: Record<string, RiseUpImportDraftRowOverride>;
  proposalActions: Record<string, "approve" | "reject" | "skip">;
  proposalWorkExpense: Record<string, RiseUpImportDraftProposalWorkExpense>;
};

export type RiseUpImportDraftSummary = {
  fileName: string;
  fileContentHash: string;
  rowCount: number;
  updatedAt: string;
  pendingNewActions: number;
  pendingProposalDecisions: number;
};

type DraftRowLike = {
  rowIndex: number;
  riseup_import_key: string;
  paymentDate: string;
  importStatus: RiseUpImportRowStatus;
  needsReview: boolean;
  isZeroAmountPending: boolean;
};

export function computeRiseUpFileContentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function riseUpPaymentMonth(paymentDate: string): string | null {
  const trimmed = paymentDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed.slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

export function isHighConfidenceNewRiseUpRow(row: DraftRowLike): boolean {
  return (
    row.importStatus === "new" &&
    !row.needsReview &&
    !row.isZeroAmountPending
  );
}

export function emptyRiseUpImportDraftState(params: {
  fileName: string;
  fileContentHash: string;
  rowCount: number;
}): RiseUpImportDraftState {
  return {
    version: RISEUP_IMPORT_DRAFT_VERSION,
    fileName: params.fileName,
    fileContentHash: params.fileContentHash,
    rowCount: params.rowCount,
    rowActions: {},
    rowOverrides: {},
    proposalActions: {},
    proposalWorkExpense: {},
  };
}

export function parseRiseUpImportDraftState(value: unknown): RiseUpImportDraftState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== RISEUP_IMPORT_DRAFT_VERSION) return null;
  if (typeof raw.fileName !== "string" || typeof raw.fileContentHash !== "string") return null;
  if (typeof raw.rowCount !== "number") return null;
  return {
    version: RISEUP_IMPORT_DRAFT_VERSION,
    fileName: raw.fileName,
    fileContentHash: raw.fileContentHash,
    rowCount: raw.rowCount,
    activeSection: typeof raw.activeSection === "string" ? raw.activeSection : undefined,
    txFilters: parseTxFilters(raw.txFilters),
    rowActions: parseStringRecord(raw.rowActions) as Record<string, RiseUpImportAction>,
    rowOverrides: parseOverridesRecord(raw.rowOverrides),
    proposalActions: parseStringRecord(raw.proposalActions) as Record<
      string,
      "approve" | "reject" | "skip"
    >,
    proposalWorkExpense: parseWorkExpenseRecord(raw.proposalWorkExpense),
  };
}

function parseTxFilters(value: unknown): RiseUpImportDraftTxFilters | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const importStatus = raw.importStatus;
  const validStatuses = new Set(["all", "new", "existing", "changed", "ambiguous"]);
  return {
    month: typeof raw.month === "string" ? raw.month : "all",
    importStatus: validStatuses.has(String(importStatus))
      ? (importStatus as RiseUpImportRowStatus | "all")
      : "all",
    needsReviewOnly: raw.needsReviewOnly === true,
  };
}

function parseStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawValue === "string") out[key] = rawValue;
  }
  return out;
}

function parseOverridesRecord(
  value: unknown,
): Record<string, RiseUpImportDraftRowOverride> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, RiseUpImportDraftRowOverride> = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) continue;
    const row = rawValue as Record<string, unknown>;
    out[key] = {
      bank_account_id: nullableString(row.bank_account_id),
      credit_card_id: nullableString(row.credit_card_id),
      payee_id: nullableString(row.payee_id),
      new_payee_name: typeof row.new_payee_name === "string" ? row.new_payee_name : "",
      category_id: nullableString(row.category_id),
      job_id: nullableString(row.job_id),
      subscription_id: nullableString(row.subscription_id),
      loan_id: nullableString(row.loan_id),
    };
  }
  return out;
}

function parseWorkExpenseRecord(
  value: unknown,
): Record<string, RiseUpImportDraftProposalWorkExpense> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, RiseUpImportDraftProposalWorkExpense> = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) continue;
    const row = rawValue as Record<string, unknown>;
    out[key] = {
      isWorkExpense: row.isWorkExpense === true,
      familyMemberId: typeof row.familyMemberId === "string" ? row.familyMemberId : "",
      jobId: typeof row.jobId === "string" ? row.jobId : "",
    };
  }
  return out;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

export function summarizeRiseUpImportDraft(
  draft: RiseUpImportDraftState,
  updatedAt: Date,
): RiseUpImportDraftSummary {
  const pendingNewActions = Object.values(draft.rowActions).filter(
    (action) => action === "create" || action === "update",
  ).length;
  const pendingProposalDecisions = Object.values(draft.proposalActions).filter(
    (action) => action !== "skip",
  ).length;
  return {
    fileName: draft.fileName,
    fileContentHash: draft.fileContentHash,
    rowCount: draft.rowCount,
    updatedAt: updatedAt.toISOString(),
    pendingNewActions,
    pendingProposalDecisions,
  };
}

export function mergeRiseUpImportDraft<T extends DraftRowLike>(params: {
  rows: T[];
  defaultActions: Record<number, RiseUpImportAction>;
  defaultOverrides: Record<number, RiseUpImportDraftRowOverride>;
  draft: RiseUpImportDraftState | null;
}): {
  actions: Record<number, RiseUpImportAction>;
  overrides: Record<number, RiseUpImportDraftRowOverride>;
  restoredRowCount: number;
} {
  const actions = { ...params.defaultActions };
  const overrides = { ...params.defaultOverrides };
  if (!params.draft) {
    return { actions, overrides, restoredRowCount: 0 };
  }

  const rowByKey = new Map(params.rows.map((row) => [row.riseup_import_key, row]));
  let restoredRowCount = 0;

  for (const [importKey, action] of Object.entries(params.draft.rowActions)) {
    const row = rowByKey.get(importKey);
    if (!row) continue;
    actions[row.rowIndex] = action;
    restoredRowCount++;
  }

  for (const [importKey, override] of Object.entries(params.draft.rowOverrides)) {
    const row = rowByKey.get(importKey);
    if (!row) continue;
    overrides[row.rowIndex] = { ...overrides[row.rowIndex], ...override };
    restoredRowCount++;
  }

  return { actions, overrides, restoredRowCount };
}

export function buildRiseUpImportDraftState(params: {
  fileName: string;
  fileContentHash: string;
  rows: Array<{ riseup_import_key: string; rowIndex: number }>;
  actions: Record<number, RiseUpImportAction>;
  overrides: Record<number, RiseUpImportDraftRowOverride>;
  proposalActions: Record<string, "approve" | "reject" | "skip">;
  proposalWorkExpense: Record<string, RiseUpImportDraftProposalWorkExpense>;
  activeSection?: string;
  txFilters?: RiseUpImportDraftTxFilters;
  proposals?: Array<{ id?: string; clientKey: string }>;
}): RiseUpImportDraftState {
  const rowByIndex = new Map(params.rows.map((row) => [row.rowIndex, row]));
  const rowActions: Record<string, RiseUpImportAction> = {};
  const rowOverrides: Record<string, RiseUpImportDraftRowOverride> = {};

  for (const [rowIndexRaw, action] of Object.entries(params.actions)) {
    const row = rowByIndex.get(Number(rowIndexRaw));
    if (!row) continue;
    rowActions[row.riseup_import_key] = action;
  }

  for (const [rowIndexRaw, override] of Object.entries(params.overrides)) {
    const row = rowByIndex.get(Number(rowIndexRaw));
    if (!row) continue;
    rowOverrides[row.riseup_import_key] = override;
  }

  const proposalActionsByClientKey: Record<string, "approve" | "reject" | "skip"> = {};
  const proposalWorkExpenseByClientKey: Record<string, RiseUpImportDraftProposalWorkExpense> = {};
  const proposalById = new Map(
    (params.proposals ?? [])
      .filter((proposal) => proposal.id)
      .map((proposal) => [proposal.id!, proposal.clientKey]),
  );

  for (const [key, action] of Object.entries(params.proposalActions)) {
    const clientKey = proposalById.get(key) ?? key;
    proposalActionsByClientKey[clientKey] = action;
  }

  for (const [key, draft] of Object.entries(params.proposalWorkExpense)) {
    const clientKey = proposalById.get(key) ?? key;
    proposalWorkExpenseByClientKey[clientKey] = draft;
  }

  return {
    version: RISEUP_IMPORT_DRAFT_VERSION,
    fileName: params.fileName,
    fileContentHash: params.fileContentHash,
    rowCount: params.rows.length,
    activeSection: params.activeSection,
    txFilters: params.txFilters,
    rowActions,
    rowOverrides,
    proposalActions: proposalActionsByClientKey,
    proposalWorkExpense: proposalWorkExpenseByClientKey,
  };
}

export function restoreProposalDraftDecisions(
  proposals: Array<{ id?: string; clientKey: string }>,
  draft: RiseUpImportDraftState | null,
): {
  proposalActions: Record<string, "approve" | "reject" | "skip">;
  proposalWorkExpense: Record<string, RiseUpImportDraftProposalWorkExpense>;
  restoredCount: number;
} {
  const proposalActions: Record<string, "approve" | "reject" | "skip"> = {};
  const proposalWorkExpense: Record<string, RiseUpImportDraftProposalWorkExpense> = {};
  if (!draft) {
    return { proposalActions, proposalWorkExpense, restoredCount: 0 };
  }

  let restoredCount = 0;
  for (const proposal of proposals) {
    if (!proposal.id) continue;
    const action = draft.proposalActions[proposal.clientKey];
    if (action) {
      proposalActions[proposal.id] = action;
      restoredCount++;
    }
    const workExpense = draft.proposalWorkExpense[proposal.clientKey];
    if (workExpense) {
      proposalWorkExpense[proposal.id] = workExpense;
      restoredCount++;
    }
  }

  return { proposalActions, proposalWorkExpense, restoredCount };
}

export function filterRiseUpImportRows<T extends DraftRowLike>(
  rows: T[],
  filters: RiseUpImportDraftTxFilters,
): T[] {
  return rows.filter((row) => {
    if (filters.needsReviewOnly && !row.needsReview) return false;
    if (filters.importStatus !== "all" && row.importStatus !== filters.importStatus) return false;
    if (filters.month !== "all") {
      const month = riseUpPaymentMonth(row.paymentDate);
      if (month !== filters.month) return false;
    }
    return true;
  });
}

export function collectRiseUpPaymentMonths(rows: Array<{ paymentDate: string }>): string[] {
  const months = new Set<string>();
  for (const row of rows) {
    const month = riseUpPaymentMonth(row.paymentDate);
    if (month) months.add(month);
  }
  return [...months].sort((a, b) => b.localeCompare(a));
}
