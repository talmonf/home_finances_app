import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { DashboardModal } from "@/components/dashboard-modal";
import { GlobalFormSubmitFeedback } from "@/components/global-form-submit-feedback";
import { PendingSubmitButtonWithSpinner } from "@/components/pending-submit-button-with-spinner";
import { SplitDateTimeField } from "@/components/split-datetime-field";
import { TherapyTransactionLinkSelect, type TherapyTransactionOption } from "@/components/therapy-transaction-link-select";
import { therapyLocalizedCategoryName } from "@/lib/therapy-localized-name";

type JobOption = { id: string; label: string };
type TypeOption = { id: string; name: string; name_he: string | null };

type InitialConsultation = {
  id: string;
  job_id: string;
  consultation_type_id: string;
  occurred_at: string;
  income_amount: string;
  income_currency: string;
  cost_amount: string;
  cost_currency: string;
  linked_income_transaction_id: string;
  linked_cost_transaction_id: string;
  notes: string;
};

type Labels = {
  title: string;
  cancel: string;
  save: string;
  saving: string;
  deleting: string;
  delete: string;
  job: string;
  type: string;
  dateTime: string;
  incomeLabel: string;
  costLabel: string;
  incomeTx: string;
  costTx: string;
  notes: string;
  txNoneLinked: string;
};

export function ConsultationModalForm({
  action,
  deleteAction,
  closeHref,
  redirectOnSuccess,
  redirectOnError,
  householdId,
  uiLanguage,
  jobs,
  types,
  transactionOptions,
  labels,
  initial,
}: {
  action: (formData: FormData) => void | Promise<void>;
  deleteAction?: (formData: FormData) => void | Promise<void>;
  closeHref: string;
  redirectOnSuccess: string;
  redirectOnError: string;
  householdId: string;
  uiLanguage: "en" | "he";
  jobs: JobOption[];
  types: TypeOption[];
  transactionOptions: TherapyTransactionOption[];
  labels: Labels;
  initial?: InitialConsultation;
}) {
  return (
    <DashboardModal title={labels.title} closeHref={closeHref} closeLabel={labels.cancel} maxWidthClassName="max-w-3xl">
      <GlobalFormSubmitFeedback />
      <form action={action} className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
        <input type="hidden" name="redirect_on_error" value={redirectOnError} />
        {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

        <div>
          <label className="block text-xs text-slate-400">{labels.job}</label>
          <select
            name="job_id"
            required
            defaultValue={initial?.job_id ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{labels.job}</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400">{labels.type}</label>
          <select
            name="consultation_type_id"
            required
            defaultValue={initial?.consultation_type_id ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{labels.type}</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {therapyLocalizedCategoryName(type, uiLanguage)}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-400">{labels.dateTime}</label>
          <div className="mt-1">
            <SplitDateTimeField name="occurred_at" required initialValue={initial?.occurred_at} uiLanguage={uiLanguage} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400">{labels.incomeLabel}</label>
          <div className="mt-1 flex gap-2">
            <input
              name="income_amount"
              defaultValue={initial?.income_amount ?? ""}
              placeholder="0.00"
              className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <input
              name="income_currency"
              defaultValue={initial?.income_currency ?? "ILS"}
              className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400">{labels.costLabel}</label>
          <div className="mt-1 flex gap-2">
            <input
              name="cost_amount"
              defaultValue={initial?.cost_amount ?? ""}
              placeholder="0.00"
              className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <input
              name="cost_currency"
              defaultValue={initial?.cost_currency ?? "ILS"}
              className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <TherapyTransactionLinkSelect
            name="linked_income_transaction_id"
            householdId={householdId}
            currentId={initial?.linked_income_transaction_id || null}
            label={labels.incomeTx}
            noneOptionLabel={labels.txNoneLinked}
            transactionOptions={transactionOptions}
          />
        </div>
        <div className="md:col-span-2">
          <TherapyTransactionLinkSelect
            name="linked_cost_transaction_id"
            householdId={householdId}
            currentId={initial?.linked_cost_transaction_id || null}
            label={labels.costTx}
            noneOptionLabel={labels.txNoneLinked}
            transactionOptions={transactionOptions}
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
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <PendingSubmitButtonWithSpinner
            label={labels.save}
            pendingLabel={labels.saving}
            className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
          />
          <a href={closeHref} className="text-sm text-slate-300 hover:text-slate-100">
            {labels.cancel}
          </a>
        </div>
      </form>
      {initial?.id && deleteAction ? (
        <ConfirmDeleteForm action={deleteAction} className="mt-5 border-t border-slate-700 pt-4">
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
          <PendingSubmitButtonWithSpinner
            label={labels.delete}
            pendingLabel={labels.deleting}
            className="inline-flex items-center rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-600 disabled:opacity-60"
          />
        </ConfirmDeleteForm>
      ) : null}
    </DashboardModal>
  );
}
