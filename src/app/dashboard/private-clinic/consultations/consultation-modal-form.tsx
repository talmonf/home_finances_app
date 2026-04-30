"use client";

import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { DashboardModal } from "@/components/dashboard-modal";
import { GlobalFormSubmitFeedback } from "@/components/global-form-submit-feedback";
import { PendingSubmitButtonWithSpinner } from "@/components/pending-submit-button-with-spinner";
import { SplitDateTimeField } from "@/components/split-datetime-field";
import { TherapyTransactionLinkSelect, type TherapyTransactionOption } from "@/components/therapy-transaction-link-select";
import { therapyLocalizedCategoryName } from "@/lib/therapy-localized-name";
import { useMemo, useState } from "react";

type JobOption = { id: string; label: string };
type TypeOption = { id: string; name: string; name_he: string | null };

type InitialConsultation = {
  id: string;
  job_id: string;
  consultation_type_id: string;
  occurred_at: string;
  amount: string;
  currency: string;
  linked_transaction_id: string;
  participant_ids: string[];
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
  amountLabel: string;
  linkedTx: string;
  clients: string;
  addAdditionalClient: string;
  remove: string;
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
  clients: Array<{ id: string; label: string }>;
  transactionOptions: TherapyTransactionOption[];
  labels: Labels;
  initial?: InitialConsultation;
}) {
  const [additionalParticipantIds, setAdditionalParticipantIds] = useState<string[]>(
    initial?.participant_ids ?? [],
  );
  const selectedAdditionalIds = useMemo(
    () => new Set(additionalParticipantIds.filter(Boolean)),
    [additionalParticipantIds],
  );

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
          <label className="block text-xs text-slate-400">{labels.amountLabel}</label>
          <div className="mt-1 flex gap-2">
            <input
              name="amount"
              defaultValue={initial?.amount ?? ""}
              placeholder="0.00"
              className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <input
              name="currency"
              defaultValue={initial?.currency ?? "ILS"}
              className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <TherapyTransactionLinkSelect
            name="linked_transaction_id"
            householdId={householdId}
            currentId={initial?.linked_transaction_id || null}
            label={labels.linkedTx}
            noneOptionLabel={labels.txNoneLinked}
            transactionOptions={transactionOptions}
          />
        </div>
        <div className="md:col-span-2">
          <span className="block text-xs text-slate-400">{labels.clients}</span>
          <div className="mt-2 space-y-2">
            {additionalParticipantIds.map((clientId, index) => (
              <div key={`consultation-client-${index}`} className="flex items-center gap-2">
                <select
                  name="additional_participant_ids"
                  value={clientId}
                  onChange={(e) => {
                    const next = [...additionalParticipantIds];
                    next[index] = e.target.value;
                    setAdditionalParticipantIds(next);
                  }}
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">{labels.clients}</option>
                  {clients.map((cl) => (
                    <option key={cl.id} value={cl.id} disabled={selectedAdditionalIds.has(cl.id) && cl.id !== clientId}>
                      {cl.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAdditionalParticipantIds((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                  className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
                >
                  {labels.remove}
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAdditionalParticipantIds((prev) => [...prev, ""])}
              className="text-sm text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline"
            >
              {labels.addAdditionalClient}
            </button>
          </div>
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
