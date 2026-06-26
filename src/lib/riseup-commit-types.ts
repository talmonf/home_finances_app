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
