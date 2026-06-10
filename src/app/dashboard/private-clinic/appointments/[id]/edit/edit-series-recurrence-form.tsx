"use client";

import { useMemo, useState } from "react";
import { HouseholdDateIsoControl } from "@/components/household-date-field";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { updateTherapyAppointmentSeriesFromDate } from "../../../actions";

type DowOption = { v: number; label: string };

type Props = {
  seriesId: string;
  effectiveDate: string;
  initialRecurrence: "weekly" | "biweekly";
  initialDayOfWeek: number;
  initialTimeOfDay: string;
  initialEndDate: string;
  initialDurationMinutes: string;
  redirectOnSuccess: string;
  dow: DowOption[];
  labels: {
    editRecurrence: string;
    editRecurrenceTitle: string;
    recurrence: string;
    dayOfWeek: string;
    timeOfDay: string;
    seriesEndDateOptional: string;
    durationMinutes: string;
    weekly: string;
    biweekly: string;
    save: string;
  };
};

export function EditSeriesRecurrenceForm({
  seriesId,
  effectiveDate,
  initialRecurrence,
  initialDayOfWeek,
  initialTimeOfDay,
  initialEndDate,
  initialDurationMinutes,
  redirectOnSuccess,
  dow,
  labels,
}: Props) {
  const [open, setOpen] = useState(false);
  const [recurrence, setRecurrence] = useState(initialRecurrence);
  const [dayOfWeek, setDayOfWeek] = useState(initialDayOfWeek);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [durationMinutes, setDurationMinutes] = useState(initialDurationMinutes);
  const [timeHour, setTimeHour] = useState(initialTimeOfDay.split(":")[0] ?? "");
  const [timeMinute, setTimeMinute] = useState(initialTimeOfDay.split(":")[1] ?? "");

  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")),
    [],
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0")),
    [],
  );
  const timeOfDay = useMemo(() => {
    if (!timeHour || !timeMinute) return "";
    return `${timeHour}:${timeMinute}`;
  }, [timeHour, timeMinute]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-lg border border-amber-500/50 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-900/40"
      >
        {labels.editRecurrence}
      </button>
    );
  }

  return (
    <form
      action={updateTherapyAppointmentSeriesFromDate}
      className="mt-3 grid gap-3 rounded-lg border border-amber-600/40 bg-amber-950/20 p-3 md:grid-cols-2"
    >
      <input type="hidden" name="series_id" value={seriesId} />
      <input type="hidden" name="effective_date" value={effectiveDate} />
      <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
      <input type="hidden" name="time_of_day" value={timeOfDay} />
      <p className="text-sm font-medium text-amber-100 md:col-span-2">{labels.editRecurrenceTitle}</p>
      <label className="space-y-1">
        <span className="block text-xs text-amber-100/80">{labels.recurrence}</span>
        <select
          name="recurrence"
          required
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as "weekly" | "biweekly")}
          className="w-full rounded-lg border border-amber-700/50 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
          <option value="weekly">{labels.weekly}</option>
          <option value="biweekly">{labels.biweekly}</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="block text-xs text-amber-100/80">{labels.dayOfWeek}</span>
        <select
          name="day_of_week"
          required
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className="w-full rounded-lg border border-amber-700/50 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
          {dow.map((d) => (
            <option key={d.v} value={d.v}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="block text-xs text-amber-100/80">{labels.timeOfDay}</span>
        <div className="grid max-w-36 grid-cols-2 gap-2">
          <select
            required
            value={timeHour}
            onChange={(e) => setTimeHour(e.target.value)}
            className="w-full rounded-lg border border-amber-700/50 bg-slate-900 px-2 py-2 text-sm text-slate-100"
          >
            <option value="">--</option>
            {hourOptions.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
          <select
            required
            value={timeMinute}
            onChange={(e) => setTimeMinute(e.target.value)}
            className="w-full rounded-lg border border-amber-700/50 bg-slate-900 px-2 py-2 text-sm text-slate-100"
          >
            <option value="">--</option>
            {minuteOptions.map((minute) => (
              <option key={minute} value={minute}>
                {minute}
              </option>
            ))}
          </select>
        </div>
      </label>
      <label className="space-y-1">
        <span className="block text-xs text-amber-100/80">{labels.durationMinutes}</span>
        <input
          name="duration_minutes"
          type="number"
          min={1}
          max={999}
          required
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          className="w-full max-w-32 rounded-lg border border-amber-700/50 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        />
      </label>
      <label className="space-y-1">
        <span className="block text-xs text-amber-100/80">{labels.seriesEndDateOptional}</span>
        <HouseholdDateIsoControl
          valueIso={endDate}
          onIsoChange={setEndDate}
          className="w-full rounded-lg border border-amber-700/50 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        />
        <input type="hidden" name="end_date" value={endDate} />
      </label>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <PendingSubmitButton
          label={labels.save}
          pendingLabel={labels.save}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-500"
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
