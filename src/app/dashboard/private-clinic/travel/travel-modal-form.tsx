import Link from "next/link";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";
import { PendingSubmitButtonWithSpinner } from "@/components/pending-submit-button-with-spinner";
import { privateClinicCommon, privateClinicTravel } from "@/lib/private-clinic-i18n";
import type { UiLanguage } from "@/lib/ui-language";
import { TravelScopeJobTreatmentOccurredFields, type TreatmentTravelOption } from "./travel-scope-job-treatment-occurred-client";

type TravelOption = {
  id: string;
  label: string;
};

type TravelModalInitial = {
  id: string;
  link_scope: "job" | "treatment";
  job_id: string;
  treatment_id: string;
  occurred_at: string;
  amount: string;
  currency: string;
  linked_transaction_id: string;
  notes: string;
};

export function TravelModalForm({
  action,
  deleteAction,
  title,
  closeHref,
  redirectOnSuccess,
  redirectOnError,
  householdId,
  uiLanguage,
  jobOptions,
  treatmentOptions,
  c,
  tv,
  initial,
}: {
  action: (formData: FormData) => Promise<void>;
  deleteAction?: (formData: FormData) => Promise<void>;
  title: string;
  closeHref: string;
  redirectOnSuccess: string;
  redirectOnError: string;
  householdId: string;
  uiLanguage: UiLanguage;
  jobOptions: TravelOption[];
  treatmentOptions: TreatmentTravelOption[];
  c: ReturnType<typeof privateClinicCommon>;
  tv: ReturnType<typeof privateClinicTravel>;
  initial?: TravelModalInitial;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6">
      <div className="w-full max-w-screen-2xl rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-medium text-slate-100">{title}</h3>
          <Link href={closeHref} className="text-sm text-slate-400 hover:text-slate-200">
            {c.cancel}
          </Link>
        </div>
        <form action={action} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
          <input type="hidden" name="redirect_on_error" value={redirectOnError} />
          {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
          <TravelScopeJobTreatmentOccurredFields
            jobOptions={jobOptions}
            treatmentOptions={treatmentOptions}
            uiLanguage={uiLanguage}
            initial={
              initial
                ? {
                    link_scope: initial.link_scope,
                    job_id: initial.job_id,
                    treatment_id: initial.treatment_id,
                    occurred_at: initial.occurred_at,
                  }
                : undefined
            }
            relatedJobLabel={tv.relatedJob}
            relatedTreatmentLabel={tv.relatedTreatment}
            jobPlaceholder={tv.jobWhenScope}
            treatmentPlaceholder={tv.treatmentWhenScope}
          />
          <div className="flex gap-2">
            <input
              name="amount"
              defaultValue={initial?.amount ?? ""}
              placeholder={tv.costAmountOptional}
              className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <input
              name="currency"
              defaultValue={initial?.currency ?? "ILS"}
              className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="md:col-span-2">
            <TherapyTransactionLinkSelect
              name="linked_transaction_id"
              householdId={householdId}
              currentId={initial?.linked_transaction_id}
              label={tv.linkTravelTx}
              hint={tv.linkTravelHint}
              noneOptionLabel={c.txNoneLinked}
            />
          </div>
          <textarea
            name="notes"
            defaultValue={initial?.notes ?? ""}
            placeholder={tv.notesRoute}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <PendingSubmitButtonWithSpinner
              label={c.save}
              pendingLabel={uiLanguage === "he" ? "שומר..." : "Saving..."}
              className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            />
            {deleteAction && initial?.id ? (
              <button formAction={deleteAction} type="submit" className="text-sm text-rose-400 hover:underline">
                {c.delete}
              </button>
            ) : null}
            <Link href={closeHref} className="text-sm text-slate-400 hover:text-slate-200">
              {c.cancel}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
