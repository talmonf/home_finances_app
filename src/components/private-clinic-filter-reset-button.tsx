"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";

type Props = {
  href: string;
  label: string;
  className?: string;
};

/**
 * Navigates to a filter-cleared URL and shows a spinner until the route transition finishes.
 */
export function PrivateClinicFilterResetButton({ href, label, className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        startTransition(() => {
          router.push(href);
        });
      }}
      className={
        className ??
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-normal text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? <LoadingSpinner className="h-3.5 w-3.5 shrink-0" /> : null}
      {label}
    </button>
  );
}
