"use client";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
  /** When true (e.g. search matches setup tiles), show tiles without a manual expand. */
  expandWhen?: boolean;
  title: string;
};

export function SetupHouseholdCollapsible({ children, expandWhen = false, title }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!expandWhen) setOpen(false);
  }, [expandWhen]);

  const effectiveOpen = expandWhen || open;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          if (!expandWhen) setOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900/60"
        aria-expanded={effectiveOpen}
      >
        <span>{title}</span>
        <span className="text-slate-400" aria-hidden>
          {effectiveOpen ? "▼" : "▶"}
        </span>
      </button>
      {effectiveOpen ? <div className="grid gap-4 md:grid-cols-3">{children}</div> : null}
    </div>
  );
}
