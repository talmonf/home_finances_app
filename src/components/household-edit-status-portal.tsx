"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type Props = {
  saved?: boolean;
  deleteError?: string;
  /** Optional server-provided diagnostic (from delete action redirect). */
  deleteDetail?: string;
};

/**
 * Renders edit-household status / delete-error banners on document.body,
 * immediately before Next.js `#next-route-announcer`, so they are not buried
 * under long page content inside the card header.
 */
export function HouseholdEditStatusPortal({ saved, deleteError, deleteDetail }: Props) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  const showSaved = Boolean(saved);
  const showLegal =
    deleteError === "privateClinicLegalBlock";
  const showFk = deleteError === "foreignKey";
  const showUnknown = deleteError === "unknown";
  const hasContent = showSaved || showLegal || showFk || showUnknown;

  useEffect(() => {
    if (!hasContent) {
      setContainer(null);
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-household-edit-status-portal", "");
    const announcer = document.getElementById("next-route-announcer");
    if (announcer?.parentNode) {
      announcer.parentNode.insertBefore(wrapper, announcer);
    } else {
      document.body.appendChild(wrapper);
    }
    setContainer(wrapper);
    return () => {
      wrapper.remove();
      setContainer(null);
    };
  }, [hasContent, saved, deleteError, deleteDetail]);

  if (!hasContent || !container) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-4">
      <div className="pointer-events-auto flex w-full max-w-screen-2xl flex-col gap-2">
        {showSaved ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-600 bg-emerald-950/60 px-3 py-2 text-xs text-emerald-100 shadow-lg shadow-slate-950/40"
          >
            Settings saved.
          </div>
        ) : null}
        {showLegal ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-600 bg-amber-950/60 px-3 py-2 text-xs text-amber-100 shadow-lg shadow-slate-950/40"
          >
            This household cannot be deleted due to legal requirements: it has Clinic appointments.
            In the future, deletion will be supported after saving a therapist journal (יומן מטפל) for later access.
          </div>
        ) : null}
        {showFk ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100 shadow-lg shadow-slate-950/40"
          >
            Household deletion failed due to related data constraints. Review linked records and try again.
          </div>
        ) : null}
        {showUnknown ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100 shadow-lg shadow-slate-950/40"
          >
            <p>Household deletion failed due to an unexpected error. Please try again.</p>
            {deleteDetail ? (
              <p className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] text-rose-200/90">
                {deleteDetail}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>,
    container,
  );
}
