"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppointmentChangeReasonFields } from "../../appointment-change-reason-fields";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  redirectOnSuccess: string;
  cancelHref: string;
  labels: {
    start: string;
    endOptional: string;
    startDate: string;
    startTime: string;
    durationMinutes: string;
    reason: string;
    notes: string;
    notesRequiredForOther: string;
    therapistRescheduled: string;
    patientRescheduled: string;
    other: string;
    save: string;
    cancelAppointment: string;
    close: string;
  };
  defaults: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    durationMinutes: string;
  };
};

export function RescheduleFormClient({
  action,
  id,
  redirectOnSuccess,
  cancelHref,
  labels,
  defaults,
}: Props) {
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endDate, setEndDate] = useState(defaults.endDate || defaults.startDate);
  const [endTime, setEndTime] = useState(defaults.endTime);
  const [durationMinutes, setDurationMinutes] = useState(defaults.durationMinutes);

  const startAtValue = useMemo(() => {
    if (!startDate || !startTime) return "";
    return `${startDate}T${startTime}`;
  }, [startDate, startTime]);

  const endAtValue = useMemo(() => {
    if (!endDate || !endTime) return "";
    return `${endDate}T${endTime}`;
  }, [endDate, endTime]);

  const syncBothDates = (nextDate: string) => {
    setStartDate(nextDate);
    setEndDate(nextDate);
  };

  useEffect(() => {
    if (!startDate || !startTime) return;
    const parsedDuration = Number.parseInt(durationMinutes, 10);
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) return;
    const start = new Date(`${startDate}T${startTime}`);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + parsedDuration * 60 * 1000);
    const localEnd = new Date(end.getTime() - end.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEndDate(localEnd.slice(0, 10));
    setEndTime(localEnd.slice(11, 16));
  }, [durationMinutes, startDate, startTime]);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
      <input type="hidden" name="start_at" value={startAtValue} />
      <input type="hidden" name="end_at" value={endAtValue} />

      <div className="space-y-1">
        <span className="block text-sm text-slate-300">{labels.start}</span>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
          <input
            type="date"
            value={startDate}
            onChange={(e) => syncBothDates(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            aria-label={labels.startDate}
          />
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="w-full max-w-36 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            aria-label={labels.startTime}
          />
        </div>
      </div>

      <div className="space-y-1">
        <span className="block text-sm text-slate-300">{labels.endOptional}</span>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
          <input
            type="date"
            value={endDate}
            onChange={(e) => syncBothDates(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            aria-label={labels.startDate}
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full max-w-36 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            aria-label={labels.startTime}
          />
        </div>
      </div>

      <label className="text-sm text-slate-300">
        {labels.durationMinutes}
        <input
          name="duration_minutes"
          type="number"
          min={1}
          max={999}
          step={1}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          className="mt-1 w-full max-w-[7rem] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </label>

      <AppointmentChangeReasonFields
        reasonFieldName="reschedule_reason"
        notesFieldName="reschedule_notes"
        reasonLabel={labels.reason}
        notesLabel={labels.notes}
        otherValue="other"
        notesRequiredMessage={labels.notesRequiredForOther}
        options={[
          { value: "Therapist rescheduled", label: labels.therapistRescheduled },
          { value: "Patient rescheduled", label: labels.patientRescheduled },
          { value: "other", label: labels.other },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          {labels.save}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex items-center text-sm font-medium text-rose-300 underline-offset-2 hover:text-rose-200 hover:underline"
        >
          {labels.cancelAppointment}
        </Link>
        <Link
          href={redirectOnSuccess}
          className="w-fit rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          {labels.close}
        </Link>
      </div>
    </form>
  );
}
