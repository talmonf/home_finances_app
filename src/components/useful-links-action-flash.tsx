"use client";

import { useSearchParams } from "next/navigation";

export function UsefulLinksActionFlash() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("usefulError");
  if (!raw) return null;
  const message = decodeURIComponent(raw.replace(/\+/g, " "));
  return (
    <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
      {message}
    </div>
  );
}
