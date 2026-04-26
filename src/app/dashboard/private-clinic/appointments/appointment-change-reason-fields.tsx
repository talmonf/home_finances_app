"use client";

import { useId, useState } from "react";

type ReasonOption = {
  value: string;
  label: string;
};

type Props = {
  reasonFieldName: "cancellation_reason" | "reschedule_reason";
  notesFieldName: "cancellation_notes" | "reschedule_notes";
  reasonLabel: string;
  notesLabel: string;
  otherValue: string;
  notesRequiredMessage: string;
  options: ReasonOption[];
};

export function AppointmentChangeReasonFields({
  reasonFieldName,
  notesFieldName,
  reasonLabel,
  notesLabel,
  otherValue,
  notesRequiredMessage,
  options,
}: Props) {
  const [reason, setReason] = useState("");
  const notesId = useId();
  const notesRequired = reason === otherValue;

  return (
    <>
      <label className="text-sm text-slate-300">
        {reasonLabel}
        <select
          name={reasonFieldName}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="" />
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-300" htmlFor={notesId}>
        {notesLabel}
        <textarea
          id={notesId}
          name={notesFieldName}
          required={notesRequired}
          aria-required={notesRequired}
          className="mt-1 min-h-24 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </label>
      {notesRequired ? <p className="text-xs text-amber-300">{notesRequiredMessage}</p> : null}
    </>
  );
}
