"use client";

import { HouseholdDateField } from "@/components/household-date-field";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  programNameShowsEndReason,
  THERAPY_CLIENT_END_REASONS,
  therapyClientEndReasonLabel,
  type TherapyClientEndReason,
} from "@/lib/therapy/client-end-reason";

type ProgramOption = { id: string; label: string };

function readProgramId(form: HTMLFormElement): string {
  const select = form.querySelector('[name="default_program_id"]') as HTMLSelectElement | null;
  return select?.value.trim() ?? "";
}

export function TherapyClientCareEndFields({
  endDateInputId,
  defaultEndDateIso,
  defaultProgramId,
  defaultEndReason,
  programs,
  endDateLabel,
  endReasonLabel,
  selectPlaceholder,
  uiLanguage,
  dateFieldClassName,
}: {
  endDateInputId: string;
  defaultEndDateIso?: string | null;
  defaultProgramId?: string | null;
  defaultEndReason?: TherapyClientEndReason | null;
  programs: ProgramOption[];
  endDateLabel: string;
  endReasonLabel: string;
  selectPlaceholder: string;
  uiLanguage: "en" | "he";
  dateFieldClassName: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const programById = useMemo(() => new Map(programs.map((p) => [p.id, p.label])), [programs]);
  const [endDateIso, setEndDateIso] = useState(defaultEndDateIso?.trim() ?? "");
  const [programId, setProgramId] = useState(defaultProgramId ?? "");
  const [endReason, setEndReason] = useState(defaultEndReason ?? "");

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;

    const syncProgram = () => setProgramId(readProgramId(form));
    syncProgram();
    form.addEventListener("change", syncProgram);
    return () => form.removeEventListener("change", syncProgram);
  }, [defaultProgramId]);

  const programLabel = programById.get(programId) ?? "";
  const showEndReason = programNameShowsEndReason(programLabel) && Boolean(endDateIso);

  useEffect(() => {
    if (!showEndReason && endReason) setEndReason("");
  }, [showEndReason, endReason]);

  return (
    <>
      <div ref={rootRef} className="space-y-1">
        <label htmlFor={endDateInputId} className="block text-xs text-slate-400">
          {endDateLabel}
        </label>
        <HouseholdDateField
          id={endDateInputId}
          name="end_date"
          defaultIsoYmd={defaultEndDateIso ?? ""}
          onIsoChange={setEndDateIso}
          className={dateFieldClassName}
        />
      </div>

      {showEndReason ? (
        <div className="space-y-1 md:col-span-2">
          <label htmlFor={`${endDateInputId}_end_reason`} className="block text-xs text-slate-400">
            {endReasonLabel}
          </label>
          <select
            id={`${endDateInputId}_end_reason`}
            name="end_reason"
            required
            value={endReason}
            onChange={(e) => setEndReason(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{selectPlaceholder}</option>
            {THERAPY_CLIENT_END_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {therapyClientEndReasonLabel(reason, uiLanguage)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </>
  );
}
