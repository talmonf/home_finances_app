"use client";

import { useRef } from "react";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

type DeleteFamilyFormProps = {
  action: ServerFormAction;
  familyId: string;
  confirmDeleteFamily: string;
  confirmDeleteClients: string;
  buttonLabel: string;
};

export function DeleteFamilyForm({
  action,
  familyId,
  confirmDeleteFamily,
  confirmDeleteClients,
  buttonLabel,
}: DeleteFamilyFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const deleteClientsRef = useRef<HTMLInputElement>(null);

  return (
    <form
      ref={formRef}
      action={action}
      className="inline"
      onSubmit={(e) => {
        e.preventDefault();
        if (!window.confirm(confirmDeleteFamily)) return;
        const deleteClients = window.confirm(confirmDeleteClients);
        if (deleteClientsRef.current) {
          deleteClientsRef.current.value = deleteClients ? "1" : "0";
        }
        formRef.current?.submit();
      }}
    >
      <input type="hidden" name="id" value={familyId} />
      <input ref={deleteClientsRef} type="hidden" name="delete_members_as_clients" defaultValue="0" />
      <button type="submit" className="rounded-lg border border-rose-700 px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/50">
        {buttonLabel}
      </button>
    </form>
  );
}
