import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { GlobalFormSubmitFeedback } from "@/components/global-form-submit-feedback";
import { PendingSubmitButtonWithSpinner } from "@/components/pending-submit-button-with-spinner";
import { SplitDateTimeField } from "@/components/split-datetime-field";
import { TherapyTransactionLinkSelect, type TherapyTransactionOption } from "@/components/therapy-transaction-link-select";
import { therapyLocalizedCategoryName } from "@/lib/therapy-localized-name";
import { ConsultationModalJobProgramFields } from "./consultation-modal-job-program-fields";
import { ConsultationModalParticipantsPicker } from "./consultation-modal-participants-client";
import { ConsultationModalCancelLink, ConsultationModalShell } from "./consultation-modal-shell";

type JobOption = { id: string; label: string };
type ProgramOption = { id: string; jobId: string; label: string };
type TypeOption = { id: string; name: string; name_he: string | null };

type InitialConsultation = {
  id: string;
  job_id: string;
  program_id: string;
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
  program: string;
  select: string;
  type: string;
  dateTime: string;
  amountLabel: string;
  linkedTx: string;
  clients: string;
  selectClientPlaceholder: string;
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
  redirectOnDeleteSuccess,
  redirectOnError,
  householdId,
  uiLanguage,
  jobs,
  programs,
  types,
  clients,
  transactionOptions,
  labels,
  initial,
  clinicOnly = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  deleteAction?: (formData: FormData) => void | Promise<void>;
  closeHref: string;
  redirectOnSuccess: string;
  /** Success URL after delete; defaults to {@link redirectOnSuccess} when omitted. */
  redirectOnDeleteSuccess?: string;
  redirectOnError: string;
  householdId: string;
  uiLanguage: "en" | "he";
  jobs: JobOption[];
  programs: ProgramOption[];
  types: TypeOption[];
  clients: Array<{ id: string; label: string }>;
  transactionOptions: TherapyTransactionOption[];
  labels: Labels;
  initial?: InitialConsultation;
  /** When true, omit bank link UI (clinic-only households). */
  clinicOnly?: boolean;
}) {
  return (
    <ConsultationModalShell title={labels.title} closeHref={closeHref} closeLabel={labels.cancel}>
      <GlobalFormSubmitFeedback />
      <form action={action} className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
        <input type="hidden" name="redirect_on_error" value={redirectOnError} />
        {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

        <ConsultationModalJobProgramFields
          jobs={jobs}
          programs={programs}
          initialJobId={initial?.job_id}
          initialProgramId={initial?.program_id}
          labels={{
            job: labels.job,
            program: labels.program,
            select: labels.select,
          }}
        />
        <div>
          <label className="block text-xs text-slate-400">{labels.type}</label>
          <select
            name="consultation_type_id"
            required
            defaultValue={initial?.consultation_type_id ?? ""}
            className="mt-1 w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{uiLanguage === "he" ? "בחר..." : "Select..."}</option>
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
            <SplitDateTimeField
              name="occurred_at"
              required
              timeOptional
              initialValue={initial?.occurred_at}
              uiLanguage={uiLanguage}
              wrapperClassName="flex flex-wrap items-end gap-2"
              dateInputClassName="h-[38px] w-[11.25rem] shrink-0 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
              timeWrapperClassName="grid w-[8.5rem] shrink-0 grid-cols-2 gap-2"
              selectClassName="w-full min-w-0 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400">{labels.amountLabel}</label>
          <div className="mt-1 flex gap-2">
            <input
              name="amount"
              defaultValue={initial?.amount ?? ""}
              placeholder="0.00"
              className="w-28 max-w-[9rem] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <input
              name="currency"
              defaultValue={initial?.currency ?? "ILS"}
              className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
        <ConsultationModalParticipantsPicker
          clients={clients}
          initialParticipantIds={initial?.participant_ids ?? []}
          labels={{
            clients: labels.clients,
            selectClientPlaceholder: labels.selectClientPlaceholder,
            addAdditionalClient: labels.addAdditionalClient,
            remove: labels.remove,
          }}
        />
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-400">{labels.notes}</label>
          <textarea
            name="notes"
            defaultValue={initial?.notes ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        {!clinicOnly ? (
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
        ) : (
          <input type="hidden" name="linked_transaction_id" value={initial?.linked_transaction_id ?? ""} />
        )}
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <PendingSubmitButtonWithSpinner
            label={labels.save}
            pendingLabel={labels.saving}
            className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
          />
          <ConsultationModalCancelLink label={labels.cancel} className="text-sm text-slate-300 hover:text-slate-100" />
        </div>
      </form>
      {initial?.id && deleteAction ? (
        <ConfirmDeleteForm action={deleteAction} className="mt-5 border-t border-slate-700 pt-4">
          <input type="hidden" name="id" value={initial.id} />
          <input
            type="hidden"
            name="redirect_on_success"
            value={redirectOnDeleteSuccess ?? redirectOnSuccess}
          />
          <PendingSubmitButtonWithSpinner
            label={labels.delete}
            pendingLabel={labels.deleting}
            className="inline-flex items-center rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-600 disabled:opacity-60"
          />
        </ConfirmDeleteForm>
      ) : null}
    </ConsultationModalShell>
  );
}
