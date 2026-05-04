"use client";

import { useRef } from "react";
import { toggleSetupSectionDone } from "@/lib/setup-section-actions";
import type { SetupSectionId } from "@/lib/setup-section-ids";

type Props = {
  sectionId: SetupSectionId;
  redirectPath: string;
  isDone: boolean;
  label: string;
  ariaLabel: string;
};

export function SetupSectionDoneInlineToggle({
  sectionId,
  redirectPath,
  isDone,
  label,
  ariaLabel,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={toggleSetupSectionDone}
      className="flex shrink-0 items-center gap-2"
    >
      <input type="hidden" name="section_id" value={sectionId} />
      <input type="hidden" name="next_is_done" value={isDone ? "false" : "true"} />
      <input type="hidden" name="redirect_to" value={redirectPath} />
      <label className="flex cursor-pointer items-center gap-2 text-xs text-emerald-100/90">
        <input
          type="checkbox"
          defaultChecked={isDone}
          className="h-3.5 w-3.5 rounded border-emerald-500/50 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
          aria-label={ariaLabel}
          onChange={() => {
            formRef.current?.requestSubmit();
          }}
        />
        <span>{label}</span>
      </label>
    </form>
  );
}
