"use client";

import { PrivateClinicTherapistFields } from "@/components/admin/private-clinic-therapist-fields";
import { PendingSubmitButtonWithSpinner } from "@/components/pending-submit-button-with-spinner";
import { useState } from "react";
import { useFormStatus } from "react-dom";

function CreateHouseholdHeaderCancel({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="button"
      onClick={onCancel}
      disabled={pending}
      className="text-sm text-sky-400 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Cancel
    </button>
  );
}

function CreateHouseholdFormActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <div className="md:col-span-3 flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancel
      </button>
      <PendingSubmitButtonWithSpinner
        label="Create household"
        pendingLabel="Creating…"
        className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
      />
    </div>
  );
}

type CreateHouseholdModalProps = {
  action: (formData: FormData) => void | Promise<void>;
  passwordPolicyHintText: string;
};

export function CreateHouseholdModal({
  action,
  passwordPolicyHintText,
}: CreateHouseholdModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
      >
        Create household
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
          <div className="max-h-[92vh] w-full max-w-screen-2xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-6">
            <form action={action} className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-100">Create household</h2>
                <CreateHouseholdHeaderCancel onCancel={() => setIsOpen(false)} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Name
                </label>
                <input
                  name="name"
                  required
                  className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="e.g. Friedlander Household"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Country
                </label>
                <input
                  name="country"
                  defaultValue="IL"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Primary currency
                </label>
                <input
                  name="primary_currency"
                  defaultValue="ILS"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <PrivateClinicTherapistFields passwordPolicyHintText={passwordPolicyHintText} />

              <CreateHouseholdFormActions onCancel={() => setIsOpen(false)} />
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
