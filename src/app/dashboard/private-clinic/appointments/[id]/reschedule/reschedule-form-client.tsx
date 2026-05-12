"use client";

import { HouseholdDateIsoControl } from "@/components/household-date-field";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AppointmentChangeReasonFields } from "../../appointment-change-reason-fields";
import { PendingSubmitButton } from "@/components/pending-submit-button";

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
    saving: string;
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
  const timeHourSuffix = labels.startTime.includes("שעה") ? "שעה" : "hour";
  const timeMinuteSuffix = labels.startTime.includes("שעה") ? "דקות" : "minute";
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const [navTarget, setNavTarget] = useState<"cancel" | "close" | null>(null);
  const [startHour, startMinute] = (defaults.startTime || "00:00").split(":");
  const [endHour, endMinute] = (defaults.endTime || "00:00").split(":");
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [startTimeHour, setStartTimeHour] = useState(startHour ?? "00");
  const [startTimeMinute, setStartTimeMinute] = useState(startMinute ?? "00");
  const [endDate, setEndDate] = useState(defaults.endDate || defaults.startDate);
  const [endTimeHour, setEndTimeHour] = useState(endHour ?? "00");
  const [endTimeMinute, setEndTimeMinute] = useState(endMinute ?? "00");
  const [durationMinutes, setDurationMinutes] = useState(defaults.durationMinutes);
  const timeHourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")),
    [],
  );
  const timeMinuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")),
    [],
  );

  const startAtValue = useMemo(() => {
    if (!startDate || !startTimeHour || !startTimeMinute) return "";
    return `${startDate}T${startTimeHour}:${startTimeMinute}`;
  }, [startDate, startTimeHour, startTimeMinute]);

  const endAtValue = useMemo(() => {
    if (!endDate || !endTimeHour || !endTimeMinute) return "";
    return `${endDate}T${endTimeHour}:${endTimeMinute}`;
  }, [endDate, endTimeHour, endTimeMinute]);

  const syncBothDates = (nextDate: string) => {
    setStartDate(nextDate);
    setEndDate(nextDate);
  };
  const navigateWithPending = (href: string, target: "cancel" | "close") => {
    setNavTarget(target);
    startNavigation(() => {
      router.push(href);
    });
  };

  useEffect(() => {
    if (!startDate || !startTimeHour || !startTimeMinute) return;
    const parsedDuration = Number.parseInt(durationMinutes, 10);
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) return;
    const start = new Date(`${startDate}T${startTimeHour}:${startTimeMinute}`);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + parsedDuration * 60 * 1000);
    const localEnd = new Date(end.getTime() - end.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEndDate(localEnd.slice(0, 10));
    setEndTimeHour(localEnd.slice(11, 13));
    setEndTimeMinute(localEnd.slice(14, 16));
  }, [durationMinutes, startDate, startTimeHour, startTimeMinute]);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
      <input type="hidden" name="start_at" value={startAtValue} />
      <input type="hidden" name="end_at" value={endAtValue} />

      <div className="space-y-1">
        <span className="block text-sm text-slate-300">{labels.start}</span>
        <div className="flex flex-wrap items-end gap-2 sm:flex-nowrap">
          <HouseholdDateIsoControl
            valueIso={startDate}
            onIsoChange={syncBothDates}
            required
            className="w-[11.5rem] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            aria-label={labels.startDate}
          />
          <div className="flex shrink-0 items-center gap-1">
            <select
              value={startTimeHour}
              onChange={(e) => setStartTimeHour(e.target.value)}
              className="w-[4.2rem] rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
              aria-label={`${labels.startTime} ${timeHourSuffix}`}
            >
              {timeHourOptions.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            <span className="text-slate-300">:</span>
            <select
              value={startTimeMinute}
              onChange={(e) => setStartTimeMinute(e.target.value)}
              className="w-[4.2rem] rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
              aria-label={`${labels.startTime} ${timeMinuteSuffix}`}
            >
              {timeMinuteOptions.map((minute) => (
                <option key={minute} value={minute}>
                  {minute}
                </option>
              ))}
            </select>
          </div>
          <label className="grid gap-1 text-sm text-slate-300 sm:ms-2 sm:min-w-[8rem]">
            <span className="text-xs leading-tight">{labels.durationMinutes}</span>
            <input
              name="duration_minutes"
              type="number"
              min={1}
              max={999}
              step={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-[7rem] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </label>
        </div>
      </div>

      <div className="space-y-1">
        <span className="block text-sm text-slate-300">{labels.endOptional}</span>
        <div className="flex flex-wrap items-center gap-2">
          <HouseholdDateIsoControl
            valueIso={endDate}
            onIsoChange={syncBothDates}
            className="w-[11.5rem] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            aria-label={labels.endOptional}
          />
          <div className="flex items-center gap-1">
            <select
              value={endTimeHour}
              onChange={(e) => setEndTimeHour(e.target.value)}
              className="w-[4.2rem] rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
              aria-label={`${labels.startTime} ${timeHourSuffix}`}
            >
              {timeHourOptions.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            <span className="text-slate-300">:</span>
            <select
              value={endTimeMinute}
              onChange={(e) => setEndTimeMinute(e.target.value)}
              className="w-[4.2rem] rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
              aria-label={`${labels.startTime} ${timeMinuteSuffix}`}
            >
              {timeMinuteOptions.map((minute) => (
                <option key={minute} value={minute}>
                  {minute}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
        <PendingSubmitButton
          label={labels.save}
          pendingLabel={labels.saving}
          className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        />
        <button
          type="button"
          onClick={() => navigateWithPending(cancelHref, "cancel")}
          disabled={isNavigating}
          className="inline-flex items-center text-sm font-medium text-rose-300 underline-offset-2 hover:text-rose-200 hover:underline"
        >
          {isNavigating && navTarget === "cancel" ? `${labels.cancelAppointment}...` : labels.cancelAppointment}
        </button>
        <button
          type="button"
          onClick={() => navigateWithPending(redirectOnSuccess, "close")}
          disabled={isNavigating}
          className="w-fit rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isNavigating && navTarget === "close" ? `${labels.close}...` : labels.close}
        </button>
      </div>
    </form>
  );
}
