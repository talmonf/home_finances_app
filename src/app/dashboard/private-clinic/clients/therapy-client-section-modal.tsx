"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";

export function TherapyClientSectionModal({
  openLabel,
  title,
  closeLabel,
  defaultOpen = false,
  summary,
  children,
}: {
  openLabel: string;
  title: string;
  closeLabel: string;
  defaultOpen?: boolean;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const titleId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const openButton = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
    >
      {openLabel}
    </button>
  );

  return (
    <div className="space-y-3">
      {summary ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
            {summary}
          </div>
          {openButton}
        </div>
      ) : (
        openButton
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-auto bg-slate-950/80 px-4 py-8"
          onClick={close}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id={titleId} className="text-lg font-semibold text-slate-50">
                {title}
              </h2>
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                {closeLabel}
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
