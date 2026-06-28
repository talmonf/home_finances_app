"use client";

import { useEffect } from "react";
import type { RiseUpImportGuideContent } from "@/lib/riseup-import-guide-content";

type Props = {
  open: boolean;
  onClose: () => void;
  content: RiseUpImportGuideContent;
};

export function RiseUpImportUserGuide({ open, onClose, content }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/85 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="riseup-import-guide-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-violet-800/60 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 id="riseup-import-guide-title" className="text-xl font-semibold text-slate-100">
            {content.modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            {content.closeButton}
          </button>
        </div>

        <div className="space-y-8 text-sm text-slate-300">
          {content.sections.map((section) => (
            <section key={section.id}>
              <h3 className="text-base font-medium text-violet-200">{section.title}</h3>
              <div className="mt-2 space-y-2">
                {section.paragraphs?.map((p) => (
                  <p key={p} className="leading-relaxed text-slate-400">
                    {p}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul className="list-disc space-y-1.5 pl-5 text-slate-400">
                    {section.bullets.map((b) => (
                      <li key={b} className="leading-relaxed">
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-xs text-slate-500">{content.guideFooterHint}</p>
      </div>
    </div>
  );
}
