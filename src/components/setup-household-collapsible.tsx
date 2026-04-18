"use client";

import { useState } from "react";

type Props = {
  children: React.ReactNode;
};

export function SetupHouseholdCollapsible({ children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900/60"
        aria-expanded={open}
      >
        <span>Setup your household</span>
        <span className="text-slate-400" aria-hidden>
          {open ? "▼" : "▶"}
        </span>
      </button>
      {open ? <div className="grid gap-4 md:grid-cols-3">{children}</div> : null}
    </div>
  );
}
