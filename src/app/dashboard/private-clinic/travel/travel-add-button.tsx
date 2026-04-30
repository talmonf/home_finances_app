"use client";

import Link from "next/link";
import { useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";

export function TravelAddButton({ href, label }: { href: string; label: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Link
      href={href}
      onClick={() => setPending(true)}
      aria-busy={pending}
      className="inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 hover:bg-sky-400 sm:w-auto"
    >
      {pending ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
      {label}
    </Link>
  );
}
