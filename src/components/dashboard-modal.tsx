import Link from "next/link";
import type { ReactNode } from "react";

type DashboardModalProps = {
  title: string;
  closeHref: string;
  closeLabel: string;
  children: ReactNode;
  maxWidthClassName?: string;
};

export function DashboardModal({
  title,
  closeHref,
  closeLabel,
  children,
  maxWidthClassName = "max-w-5xl",
}: DashboardModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
      <div
        className={`max-h-[90vh] w-full overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl ${maxWidthClassName}`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-slate-200">{title}</h2>
          <div className="flex items-center gap-3">
            <Link href={closeHref} className="text-sm text-slate-400 hover:text-slate-200">
              {closeLabel}
            </Link>
            <Link
              href={closeHref}
              aria-label={closeLabel}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-100"
            >
              <span aria-hidden="true" className="text-base leading-none">×</span>
            </Link>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
