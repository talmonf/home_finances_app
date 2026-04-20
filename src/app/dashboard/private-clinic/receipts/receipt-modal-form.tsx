import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";
import {
  ReceiptModalFormClient,
  type ReceiptModalInitial,
  type ReceiptModalLabels,
} from "./receipt-modal-form-client";
import type { ReactNode } from "react";

export type { ReceiptModalInitial };

type ReceiptModalFormLabels = ReceiptModalLabels & {
  linkTxPayment: string;
  linkTxPaymentHint: string;
  txNoneLinked: string;
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
}: {
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  closeHref: string;
  redirectOnSuccess: string;
  redirectOnError: string;
  householdId: string;
  jobs: { id: string; label: string }[];
  programs: { id: string; jobId: string; label: string }[];
  clients: { id: string; first_name: string; last_name: string | null; jobIds: string[] }[];
  labels: ReceiptModalFormLabels;
  initial?: ReceiptModalInitial;
  extraContent?: ReactNode;
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
    totalAmount: labels.totalAmount,
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
    linkBankOptional: labels.linkBankOptional,
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
    >
      <TherapyTransactionLinkSelect
        name="linked_transaction_id"
        householdId={householdId}
        currentId={initial?.linked_transaction_id ?? null}
        label={labels.linkTxPayment}
        hint={labels.linkTxPaymentHint}
        noneOptionLabel={labels.txNoneLinked}
      />
    </ReceiptModalFormClient>
  );
}
