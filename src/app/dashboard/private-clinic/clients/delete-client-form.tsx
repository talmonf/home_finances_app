"use client";

import { LoadingSpinner } from "@/components/loading-spinner";
import { useRef, useState } from "react";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

type DeleteClientFormProps = {
  action: ServerFormAction;
  clientId: string;
  confirmMessage: string;
  buttonLabel: string;
  deletingLabel: string;
};

export function DeleteClientForm({ action, clientId, confirmMessage, buttonLabel, deletingLabel }: DeleteClientFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form ref={formRef} action={action} className="rounded-xl border border-rose-800 bg-rose-950/20 p-4">
      <input type="hidden" name="id" value={clientId} />
      <input type="hidden" name="redirect_on_error" value={`/dashboard/private-clinic/clients/${clientId}/edit`} />
      <button
        type="button"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        onClick={() => {
          if (!window.confirm(confirmMessage)) return;
          setIsSubmitting(true);
          formRef.current?.requestSubmit();
        }}
        className="inline-flex items-center rounded-lg border border-rose-700 px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <LoadingSpinner className="mr-1.5 h-3.5 w-3.5" /> : null}
        {isSubmitting ? deletingLabel : buttonLabel}
      </button>
    </form>
  );
}
