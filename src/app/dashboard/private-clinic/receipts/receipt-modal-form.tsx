import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";
import type { ReactNode } from "react";

type JobOption = { id: string; label: string };

type Labels = {
  titleNew: string;
  titleEdit: string;
  save: string;
  cancel: string;
  job: string;
  receiptNumber: string;
  date: string;
  totalAmount: string;
  currency: string;
  coveredStart: string;
  coveredEnd: string;
  recipient: string;
  paymentMethod: string;
  notes: string;
  recipientClient: string;
  recipientOrg: string;
  paymentCash: string;
  paymentBank: string;
  paymentDigital: string;
  paymentCredit: string;
  linkBankOptional: string;
  linkTxPayment: string;
  linkTxPaymentHint: string;
  txNoneLinked: string;
};

export type ReceiptModalInitial = {
  id?: string;
  job_id?: string;
  receipt_number?: string;
  issued_at?: string;
  total_amount?: string;
  currency?: string;
  covered_period_start?: string;
  covered_period_end?: string;
  recipient_type?: "client" | "organization";
  payment_method?: "cash" | "bank_transfer" | "digital_card" | "credit_card";
  linked_transaction_id?: string;
  notes?: string;
};

export function ReceiptModalForm({
  action,
  mode,
  closeHref,
  redirectOnSuccess,
  redirectOnError,
  householdId,
  jobs,
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
  jobs: JobOption[];
  labels: Labels;
  initial?: ReceiptModalInitial;
  extraContent?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-100">{mode === "create" ? labels.titleNew : labels.titleEdit}</h2>
          <a href={closeHref} className="text-sm text-sky-400 hover:text-sky-300">
            {labels.cancel}
          </a>
        </div>
        <form action={action} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
          <input type="hidden" name="redirect_on_error" value={redirectOnError} />
          {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

          <div>
            <label className="block text-xs text-slate-400">{labels.job}</label>
            <select
              name="job_id"
              required
              defaultValue={initial?.job_id ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{labels.job}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.receiptNumber}</label>
            <input
              name="receipt_number"
              required
              defaultValue={initial?.receipt_number ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.date}</label>
            <input
              name="issued_at"
              type="date"
              required
              defaultValue={initial?.issued_at ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.totalAmount}</label>
            <input
              name="total_amount"
              required
              defaultValue={initial?.total_amount ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.currency}</label>
            <input
              name="currency"
              defaultValue={initial?.currency ?? "ILS"}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.coveredStart}</label>
            <input
              name="covered_period_start"
              type="date"
              defaultValue={initial?.covered_period_start ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.coveredEnd}</label>
            <input
              name="covered_period_end"
              type="date"
              defaultValue={initial?.covered_period_end ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.recipient}</label>
            <select
              name="recipient_type"
              required
              defaultValue={initial?.recipient_type ?? "client"}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="client">{labels.recipientClient}</option>
              <option value="organization">{labels.recipientOrg}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.paymentMethod}</label>
            <select
              name="payment_method"
              required
              defaultValue={initial?.payment_method ?? "cash"}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="cash">{labels.paymentCash}</option>
              <option value="bank_transfer">{labels.paymentBank}</option>
              <option value="digital_card">{labels.paymentDigital}</option>
              <option value="credit_card">{labels.paymentCredit}</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">{labels.linkBankOptional}</label>
            <TherapyTransactionLinkSelect
              name="linked_transaction_id"
              householdId={householdId}
              currentId={initial?.linked_transaction_id ?? null}
              label={labels.linkTxPayment}
              hint={labels.linkTxPaymentHint}
              noneOptionLabel={labels.txNoneLinked}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">{labels.notes}</label>
            <textarea
              name="notes"
              defaultValue={initial?.notes ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {labels.save}
            </button>
            <a href={closeHref} className="text-sm text-slate-300 hover:text-slate-100">
              {labels.cancel}
            </a>
          </div>
          {extraContent ? <div className="md:col-span-2">{extraContent}</div> : null}
        </form>
      </div>
    </div>
  );
}
