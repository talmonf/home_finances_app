"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setSessionObfuscate } from "@/app/dashboard/session-ui-actions";

export function ObfuscateSessionToggle({
  initialOn,
  isHebrew,
}: {
  initialOn: boolean;
  isHebrew: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={initialOn}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            await setSessionObfuscate(next);
            router.refresh();
          });
        }}
        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 disabled:opacity-50"
      />
      <span>
        {isHebrew
          ? "הסתרת שמות לקוחות וסכומים (הדגמה)"
          : "Hide client names & amounts (demo)"}
      </span>
    </label>
  );
}
