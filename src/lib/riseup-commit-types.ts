export type RiseUpImportAction = "create" | "update" | "skip";

export type RiseUpImportRowStatus = "new" | "existing" | "changed" | "ambiguous";

export type RiseUpImportDiff = {
  field: string;
  label: string;
  existing: string | null;
  incoming: string | null;
};

export type RiseUpExistingTransactionSummary = {
  id: string;
  transactionDate: string;
  amount: number;
  transactionDirection: "debit" | "credit";
  description: string | null;
  contentHash: string | null;
};

export type RiseUpProposalStatus = "proposed" | "approved" | "rejected" | "applied" | "undone";

export type RiseUpProposalKind =
  | "create_entity"
  | "update_entity"
  | "link_transactions"
  | "category_mapping"
  | "payee_cluster";

export type RiseUpEntityKind =
  | "bank_account"
  | "credit_card"
  | "payee"
  | "category"
  | "job"
  | "subscription"
  | "loan"
  | "property"
  | "property_utility"
  | "insurance_policy"
  | "donation"
  | "savings_policy"
  | "digital_payment_method"
  | "car";

export type RiseUpProposalConfidence = "high" | "medium" | "low";

export type RiseUpProposalSupportRow = {
  rowIndex: number;
  riseup_import_key?: string;
  transaction_id?: string | null;
  support_role: "evidence" | "primary_payment" | "recurring_instance" | "backfill_candidate";
  confidence?: RiseUpProposalConfidence;
};

export type RiseUpPatternKind =
  | "payment_instrument"
  | "work_income"
  | "benefit_income"
  | "transfer_or_refund_income"
  | "subscription"
  | "recurring_obligation"
  | "insurance"
  | "loan_return"
  | "installment_or_annual"
  | "petrol"
  | "petrol_review";

export type RiseUpDetectedPattern = {
  key: string;
  kind: RiseUpPatternKind;
  title: string;
  confidence: RiseUpProposalConfidence;
  firstMonth: string;
  lastMonth: string;
  activeMonths: number;
  rowCount: number;
  averageAmount: number;
  medianAmount: number;
  totalAmount: number;
  startedDuringPeriod: boolean;
  endedDuringPeriod: boolean;
  reviewReason?: string;
  metadata: Record<string, unknown>;
  supportRows: RiseUpProposalSupportRow[];
};

export type RiseUpPatternSummary = {
  periodFirstMonth: string;
  periodLastMonth: string;
  totalPatterns: number;
  byKind: Record<string, number>;
  highlights: RiseUpDetectedPattern[];
};

export type RiseUpImportProposal = {
  id?: string;
  clientKey: string;
  proposal_kind: RiseUpProposalKind;
  entity_kind: RiseUpEntityKind;
  target_entity_id: string | null;
  status: RiseUpProposalStatus;
  confidence: RiseUpProposalConfidence;
  title: string;
  summary: string;
  payload_json: Record<string, unknown>;
  proposed_changes_json: Record<string, unknown>;
  supportRows: RiseUpProposalSupportRow[];
};

export type RiseUpProposalSummary = {
  total: number;
  byEntityKind: Record<string, number>;
  byConfidence: Record<string, number>;
};

export type RiseUpAnalyzeSummary = {
  new: number;
  existing: number;
  changed: number;
  ambiguous: number;
  needsReview: number;
  legacyScanned: number;
  legacyBackfilled: number;
  legacyAmbiguous: number;
  proposals: RiseUpProposalSummary;
  patterns?: RiseUpPatternSummary;
};

export type RiseUpCommitRowPayload = {
  rowIndex: number;
  riseup_import_key: string;
  riseup_content_hash: string;
  import_action?: RiseUpImportAction;
  businessName: string;
  paymentMethodRaw: string;
  paymentIdentifierRaw: string;
  paymentDate: string;
  chargeDate: string | null;
  amount: number;
  originalAmount: number | null;
  sourceKind: string;
  cashflowCategory: string;
  isZeroAmountPending: boolean;
  raw: Record<string, string>;
  bank_account_id: string | null;
  credit_card_id: string | null;
  payee_id: string | null;
  new_payee_name: string | null;
  category_id: string | null;
  job_id: string | null;
  subscription_id: string | null;
  loan_id: string | null;
};

export type RiseUpCommitProposalPayload = {
  id: string;
  action: "approve" | "reject" | "skip";
};

export type RiseUpCommitSummary = {
  created: number;
  updated: number;
  skipped: number;
  skippedExisting: number;
  skippedAmbiguous: number;
  skippedByUser: number;
  changedRows: number;
  proposalsApproved: number;
  proposalsApplied: number;
  proposalLinksCreated: number;
};
