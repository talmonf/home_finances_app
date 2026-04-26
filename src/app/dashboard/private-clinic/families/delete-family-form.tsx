"use client";

import { useRef, useState } from "react";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

type DeleteFamilyFormProps = {
  action: ServerFormAction;
  familyId: string;
  confirmTitle: string;
  confirmDeleteFamilyOnly: string;
  confirmDeleteFamilyAndClients: string;
  cancelLabel: string;
  buttonLabel: string;
};

export function DeleteFamilyForm({
  action,
  familyId,
  confirmTitle,
  confirmDeleteFamilyOnly,
  confirmDeleteFamilyAndClients,
  cancelLabel,
  buttonLabel,
}: DeleteFamilyFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const deleteClientsRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const submitDelete = (deleteClients: boolean) => {
    if (deleteClientsRef.current) {
      deleteClientsRef.current.value = deleteClients ? "1" : "0";
    }
    formRef.current?.requestSubmit();
  };

  return (
    <>
      <form ref={formRef} action={action} className="inline">
        <input type="hidden" name="id" value={familyId} />
        <input ref={deleteClientsRef} type="hidden" name="delete_members_as_clients" defaultValue="0" />
      </form>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="rounded-lg border border-rose-700 px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/50"
      >
        {buttonLabel}
      </button>
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl"
          >
            <p className="text-sm text-slate-200">{confirmTitle}</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  submitDelete(false);
                }}
                className="rounded-lg border border-amber-700 px-3 py-1.5 text-sm text-amber-300 hover:bg-amber-950/40"
              >
                {confirmDeleteFamilyOnly}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  submitDelete(true);
                }}
                className="rounded-lg border border-rose-700 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-950/40"
              >
                {confirmDeleteFamilyAndClients}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
