"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { DELETE_CONFIRM_MESSAGE } from "@/components/confirm-delete";
import { LoadingSpinner } from "@/components/loading-spinner";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

export function ConsultationReportActions({
  deleteAction,
  saveLabel,
  savingLabel,
  deleteLabel,
  deletingLabel,
  redirectOnDeleteSuccess,
}: {
  deleteAction: ServerFormAction;
  saveLabel: string;
  savingLabel: string;
  deleteLabel: string;
  deletingLabel: string;
  redirectOnDeleteSuccess: string;
}) {
  const { pending } = useFormStatus();
  const [submitter, setSubmitter] = useState<"save" | "delete" | null>(null);
  const deleting = pending && submitter === "delete";

  return (
    <div className="md:col-span-2 flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending && !deleting}
        data-skip-global-text-replace=""
        onClick={() => setSubmitter("save")}
        className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
      >
        {pending && !deleting ? <LoadingSpinner className="mr-1.5 h-3.5 w-3.5" /> : null}
        {pending && !deleting ? savingLabel : saveLabel}
      </button>
      <button
        type="submit"
        formAction={deleteAction}
        disabled={pending}
        aria-busy={deleting}
        data-skip-global-submit-feedback=""
        data-skip-global-text-replace=""
        onClick={(event) => {
          if (!window.confirm(DELETE_CONFIRM_MESSAGE)) {
            event.preventDefault();
            return;
          }
          setSubmitter("delete");
          const redirect = event.currentTarget.form?.elements.namedItem("redirect_on_success");
          if (redirect instanceof HTMLInputElement) {
            redirect.value = redirectOnDeleteSuccess;
          }
        }}
        className="inline-flex items-center rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-600 disabled:opacity-60"
      >
        {deleting ? <LoadingSpinner className="mr-1.5 h-3.5 w-3.5" /> : null}
        {deleting ? deletingLabel : deleteLabel}
      </button>
    </div>
  );
}
