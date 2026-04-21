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
          <Link href={closeHref} className="text-sm text-slate-400 hover:text-slate-200">
            {closeLabel}
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
