"use client";

import { PasswordInputWithToggle } from "@/components/PasswordInputWithToggle";
import type { UiLanguage } from "@/lib/ui-language";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { changePasswordAction, type ChangePasswordActionState } from "./actions";

function SubmitButton({ language }: { language: UiLanguage }) {
  const { pending } = useFormStatus();
  const he = language === "he";
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400 disabled:opacity-60"
    >
      {pending ? (he ? "שומר…" : "Saving…") : he ? "עדכון סיסמה" : "Update password"}
    </button>
  );
}

type ChangePasswordFormProps = {
  error: string | null;
  language: UiLanguage;
};

export function ChangePasswordForm({ error, language }: ChangePasswordFormProps) {
  const he = language === "he";
  const [state, formAction] = useActionState<
    ChangePasswordActionState | null,
    FormData
  >(changePasswordAction, null);

  useEffect(() => {
    if (state && "redirectTo" in state) {
      window.location.assign(state.redirectTo);
    }
  }, [state]);

  const displayError =
    state && "error" in state ? state.error : error;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-200">
          {he ? "סיסמה נוכחית" : "Current password"}
        </label>
        <PasswordInputWithToggle
          name="current_password"
          autoComplete="current-password"
          required
          className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-200">
          {he ? "סיסמה חדשה" : "New password"}
        </label>
        <PasswordInputWithToggle
          name="new_password"
          autoComplete="new-password"
          required
          className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-200">
          {he ? "אימות סיסמה חדשה" : "Confirm new password"}
        </label>
        <PasswordInputWithToggle
          name="confirm_password"
          autoComplete="new-password"
          required
          className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
      </div>
      {displayError ? <p className="text-sm font-medium text-rose-400">{displayError}</p> : null}
      <SubmitButton language={language} />
    </form>
  );
}
