import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";
import {
  ReceiptModalFormClient,
  type MorningNumberingConfigForForm,
  type ReceiptModalInitial,
  type ReceiptModalLabels,
  type ReceiptModalPeriodPreviewLabels,
} from "./receipt-modal-form-client";
import type { ReactNode } from "react";

export type { ReceiptModalInitial };

type ReceiptModalFormLabels = ReceiptModalLabels & {
  linkTxPayment: string;
  linkTxPaymentHint: string;
  txNoneLinked: string;
  morningConnectedBadge: string;
  morningReceiptNumberHint: string;
  downloadDocument: string;
  retryMorningIssue: string;
  morningIssueFailed: string;
  morningIssued: string;
  receiptNumberingChoiceLabel: string;
  receiptNumberingMorning: string;
  receiptNumberingManual: string;
  receiptNumberingManualHint: string;
};

export async function ReceiptModalForm({
  action,
  mode,
  closeHref,
  redirectOnSuccess,
  redirectOnError,
  householdId,
  jobs,
  programs,
  clients,
  labels,
  initial,
  extraContent,
  formExtraContent,
  periodPreviewLabels,
  periodPreviewVisitTypeOptions,
  clinicOnly = false,
  morningNumberingByJobId = {},
}: {
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  closeHref: string;
  redirectOnSuccess: string;
  redirectOnError: string;
  householdId: string;
  jobs: {
    id: string;
    label: string;
    defaultReceiptKind: "regular" | "salary_fictitious";
    defaultCoveredPeriodToPreviousMonth: boolean;
  }[];
  programs: { id: string; jobId: string; label: string }[];
  clients: { id: string; first_name: string; last_name: string | null; jobIds: string[] }[];
  labels: ReceiptModalFormLabels;
  initial?: ReceiptModalInitial;
  extraContent?: ReactNode;
  formExtraContent?: ReactNode;
  periodPreviewLabels?: ReceiptModalPeriodPreviewLabels;
  periodPreviewVisitTypeOptions?: { id: string; label: string }[];
  clinicOnly?: boolean;
  morningNumberingByJobId?: Record<string, MorningNumberingConfigForForm>;
}) {
  const clientLabels: ReceiptModalLabels = {
    titleNew: labels.titleNew,
    titleEdit: labels.titleEdit,
    save: labels.save,
    cancel: labels.cancel,
    job: labels.job,
    program: labels.program,
    programOptionalEmpty: labels.programOptionalEmpty,
    client: labels.client,
    selectClient: labels.selectClient,
    receiptNumber: labels.receiptNumber,
    date: labels.date,
    grossAmount: labels.grossAmount,
    grossAmountHint: labels.grossAmountHint,
    netAmount: labels.netAmount,
    netAmountHint: labels.netAmountHint,
    receiptKind: labels.receiptKind,
    receiptKindRegular: labels.receiptKindRegular,
    receiptKindSalaryFictitious: labels.receiptKindSalaryFictitious,
    currency: labels.currency,
    coveredStart: labels.coveredStart,
    coveredEnd: labels.coveredEnd,
    recipient: labels.recipient,
    selectRecipient: labels.selectRecipient,
    paymentMethod: labels.paymentMethod,
    selectPaymentMethod: labels.selectPaymentMethod,
    notes: labels.notes,
    recipientClient: labels.recipientClient,
    recipientOrg: labels.recipientOrg,
    paymentCash: labels.paymentCash,
    paymentBank: labels.paymentBank,
    paymentDigital: labels.paymentDigital,
    paymentCredit: labels.paymentCredit,
    paymentDate: labels.paymentDate,
    paymentDateHint: labels.paymentDateHint,
    linkBankOptional: labels.linkBankOptional,
    morningConnectedBadge: labels.morningConnectedBadge,
    morningReceiptNumberHint: labels.morningReceiptNumberHint,
    receiptNumberingChoiceLabel: labels.receiptNumberingChoiceLabel,
    receiptNumberingMorning: labels.receiptNumberingMorning,
    receiptNumberingManual: labels.receiptNumberingManual,
    receiptNumberingManualHint: labels.receiptNumberingManualHint,
    downloadDocument: labels.downloadDocument,
    retryMorningIssue: labels.retryMorningIssue,
    morningIssueFailed: labels.morningIssueFailed,
    morningIssued: labels.morningIssued,
  };

  return (
    <ReceiptModalFormClient
      action={action}
      mode={mode}
      closeHref={closeHref}
      redirectOnSuccess={redirectOnSuccess}
      redirectOnError={redirectOnError}
      jobs={jobs}
      programs={programs}
      clients={clients}
      labels={clientLabels}
      initial={initial}
      extraContent={extraContent}
      formExtraContent={formExtraContent}
      periodPreviewLabels={periodPreviewLabels}
      periodPreviewVisitTypeOptions={periodPreviewVisitTypeOptions}
      showBankLink={!clinicOnly}
      morningNumberingByJobId={morningNumberingByJobId}
    >
      {!clinicOnly ? (
        <TherapyTransactionLinkSelect
          name="linked_transaction_id"
          householdId={householdId}
          currentId={initial?.linked_transaction_id ?? null}
          label={labels.linkTxPayment}
          hint={labels.linkTxPaymentHint}
          noneOptionLabel={labels.txNoneLinked}
        />
      ) : null}
    </ReceiptModalFormClient>
  );
}
