"use client";

import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { PendingSubmitButtonWithSpinner } from "@/components/pending-submit-button-with-spinner";
import { SplitDateTimeField } from "@/components/split-datetime-field";
import { ConsultationModalCancelLink, ConsultationModalShell } from "./consultation-modal-shell";

export function ConsultationRescheduleForm({
  action,
  closeHref,
  redirectOnSuccess,
  redirectOnError,
  consultationId,
  initialOccurredAt,
  initialDurationMinutes,
  uiLanguage,
  labels,
}: {
  action: (formData: FormData) => void | Promise<void>;
  closeHref: string;
  redirectOnSuccess: string;
  redirectOnError: string;
  consultationId: string;
  initialOccurredAt: string;
  initialDurationMinutes: number;
  uiLanguage: "en" | "he";
  labels: {
    title: string;
    cancel: string;
    save: string;
    saving: string;
    dateTime: string;
    duration: string;
  };
}) {
  return (
    <ConsultationModalShell title={labels.title} closeHref={closeHref} closeLabel={labels.cancel}>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
        <input type="hidden" name="redirect_on_error" value={redirectOnError} />
        <input type="hidden" name="id" value={consultationId} />
        <div>
          <label className="block text-xs text-slate-400">{labels.dateTime}</label>
          <div className="mt-1">
            <SplitDateTimeField
              name="occurred_at"
              required
              initialValue={initialOccurredAt}
              uiLanguage={uiLanguage}
              wrapperClassName="flex flex-wrap items-end gap-2"
              dateInputClassName="h-[38px] w-[11.25rem] shrink-0 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
              timeWrapperClassName="grid w-[8.5rem] shrink-0 grid-cols-2 gap-2"
              selectClassName="w-full min-w-0 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400">{labels.duration}</label>
          <input
            name="duration_minutes"
            type="number"
            min={1}
            max={999}
            step={1}
            required
            defaultValue={initialDurationMinutes}
            className="mt-1 w-28 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PendingSubmitButtonWithSpinner
            label={labels.save}
            pendingLabel={labels.saving}
            className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
          />
          <ConsultationModalCancelLink label={labels.cancel} className="text-sm text-slate-300 hover:text-slate-100" />
        </div>
      </form>
    </ConsultationModalShell>
  );
}

export function ConsultationCancelForm({
  action,
  closeHref,
  redirectOnSuccess,
  consultationId,
  labels,
}: {
  action: (formData: FormData) => void | Promise<void>;
  closeHref: string;
  redirectOnSuccess: string;
  consultationId: string;
  labels: {
    title: string;
    cancel: string;
    confirm: string;
    submit: string;
    saving: string;
  };
}) {
  return (
    <ConsultationModalShell title={labels.title} closeHref={closeHref} closeLabel={labels.cancel}>
      <p className="text-sm text-slate-300">{labels.confirm}</p>
      <ConfirmDeleteForm action={action} message={labels.confirm} className="mt-4">
        <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
        <input type="hidden" name="id" value={consultationId} />
        <PendingSubmitButtonWithSpinner
          label={labels.submit}
          pendingLabel={labels.saving}
          className="inline-flex items-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
        />
      </ConfirmDeleteForm>
    </ConsultationModalShell>
  );
}
