"use client";

import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { PendingSubmitButtonWithSpinner } from "@/components/pending-submit-button-with-spinner";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

type HouseholdDeleteSubmitProps = {
  action: ServerFormAction;
  householdId: string;
  householdName: string;
};

export function HouseholdDeleteSubmit({
  action,
  householdId,
  householdName,
}: HouseholdDeleteSubmitProps) {
  return (
    <ConfirmDeleteForm
      action={action}
      className="inline"
      message={`Delete household "${householdName}" permanently?\n\nThis deletes all related data shown above and cannot be undone.\n\nDeletion is blocked if Clinic appointments exist due to legal requirements.`}
    >
      <input type="hidden" name="household_id" value={householdId} />
      <input type="hidden" name="tab" value="danger" />
      <PendingSubmitButtonWithSpinner
        label="Delete household permanently"
        pendingLabel="Deleting household…"
        className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-70"
      />
    </ConfirmDeleteForm>
  );
}
