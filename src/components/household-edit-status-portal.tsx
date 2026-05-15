"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type Props = {
  saved?: boolean;
};

/** Renders the settings-saved banner without overlapping page chrome. */
export function HouseholdEditStatusPortal({ saved }: Props) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  const showSaved = Boolean(saved);
  const hasContent = showSaved;

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
  }, [hasContent, saved]);

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
      </div>
    </div>,
    container,
  );
}
