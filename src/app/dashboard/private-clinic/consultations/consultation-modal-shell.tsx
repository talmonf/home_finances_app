"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const CloseModalContext = createContext<(() => void) | null>(null);

export function ConsultationModalShell({
  title,
  closeHref,
  closeLabel,
  children,
  maxWidthClassName = "max-w-3xl",
}: {
  title: string;
  closeHref: string;
  closeLabel: string;
  children: ReactNode;
  maxWidthClassName?: string;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [, startTransition] = useTransition();

  const closeModal = useCallback(() => {
    setDismissed(true);
    startTransition(() => {
      router.push(closeHref);
    });
  }, [closeHref, router]);

  if (dismissed) return null;

  return (
    <CloseModalContext.Provider value={closeModal}>
      <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
        <div
          className={`max-h-[92vh] w-full overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5 ${maxWidthClassName}`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-slate-100">{title}</h2>
            <ConsultationModalCancelLink label={closeLabel} className="text-sm text-sky-400 hover:text-sky-300" />
          </div>
          {children}
        </div>
      </div>
    </CloseModalContext.Provider>
  );
}

export function ConsultationModalCancelLink({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const closeModal = useContext(CloseModalContext);
  if (!closeModal) {
    return (
      <span className={className} aria-hidden="true">
        {label}
      </span>
    );
  }

  return (
    <button type="button" onClick={closeModal} className={className}>
      {label}
    </button>
  );
}
