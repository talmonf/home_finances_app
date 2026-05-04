"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";

export function ConsultationsAddButton({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Link
      href={href}
      aria-busy={isPending}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        startTransition(() => {
          router.push(href);
        });
      }}
      className="inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 hover:bg-sky-400 sm:w-auto"
    >
      {isPending ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
      {label}
    </Link>
  );
}
