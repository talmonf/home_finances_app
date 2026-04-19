"use client";

import { PasswordInputWithToggle } from "@/components/PasswordInputWithToggle";
import { useFormStatus } from "react-dom";
import { changePasswordAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Update password"}
    </button>
  );
}

type ChangePasswordFormProps = {
  error: string | null;
};

export function ChangePasswordForm({ error }: ChangePasswordFormProps) {
  return (
    <form action={changePasswordAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-200">Current password</label>
        <PasswordInputWithToggle
          name="current_password"
          autoComplete="current-password"
          required
          className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-200">New password</label>
        <PasswordInputWithToggle
          name="new_password"
          autoComplete="new-password"
          required
          className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-200">Confirm new password</label>
        <PasswordInputWithToggle
          name="confirm_password"
          autoComplete="new-password"
          required
          className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
      </div>
      {error ? <p className="text-sm font-medium text-rose-400">{error}</p> : null}
      <SubmitButton />
    </form>
  );
}
