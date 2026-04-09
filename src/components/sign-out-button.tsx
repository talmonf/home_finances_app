"use client";

import { signOut } from "next-auth/react";

type SignOutButtonProps = {
  label: string;
  confirmMessage: string;
};

export function SignOutButton({ label, confirmMessage }: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (!window.confirm(confirmMessage)) return;
        await signOut({ callbackUrl: "/" });
      }}
      className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
    >
      {label}
    </button>
  );
}
