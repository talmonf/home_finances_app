"use client";

import { useMemo, useState } from "react";
import { HouseholdDateIsoControl } from "@/components/household-date-field";

type JobOption = { id: string; label: string };
type ProgramOption = { id: string; jobId: string; label: string };
type ClientOption = { id: string; label: string };
type VisitOption = { value: string; label: string };

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  redirectOnSuccess: string;
  initialJobId: string;
  initialProgramId: string;
  initialClientId: string;
  initialAdditionalClientIds: string[];
  initialVisitType: string;
  initialStatus: string;
  initialCancellationReason: string;
  initialStartAt: string;
  initialEndAt: string;
  initialDurationMinutes: string;
  labels: {
    client: string;
    job: string;
    additionalClients: string;
    addAdditionalClient: string;
    remove: string;
    programOptional: string;
    visitType: string;
    status: string;
    startDateTime: string;
    endOptional: string;
    startDate: string;
    startTime: string;
    durationMinutes: string;
    cancellationReason: string;
    statusScheduled: string;
    statusCompleted: string;
    statusCancelled: string;
    save: string;
  };
  jobs: JobOption[];
  programs: ProgramOption[];
  clients: ClientOption[];
  visitOptions: VisitOption[];
};

export function AppointmentEditFormClient(props: Props) {
  const timeHourSuffix =
    props.labels.startTime.includes("שעה") || props.labels.startDateTime.includes("שעה") ? "שעה" : "hour";
  const timeMinuteSuffix =
    props.labels.startTime.includes("שעה") || props.labels.startDateTime.includes("שעה") ? "דקות" : "minute";
  const [jobId, setJobId] = useState(props.initialJobId);
  const [programId, setProgramId] = useState(props.initialProgramId);
  const [additionalClientIds, setAdditionalClientIds] = useState(
    props.initialAdditionalClientIds.filter(Boolean),
  );
  const [startDatePart = "", startTimePart = ""] = props.initialStartAt.slice(0, 16).split("T");
  const [endDatePart = "", endTimePart = ""] = props.initialEndAt.slice(0, 16).split("T");
  const [startHour = "00", startMinute = "00"] = startTimePart.split(":");
  const [endHour = "00", endMinute = "00"] = endTimePart.split(":");
  const [startDate, setStartDate] = useState(startDatePart);
  const [startTimeHour, setStartTimeHour] = useState(startHour);
  const [startTimeMinute, setStartTimeMinute] = useState(startMinute);
  const [durationMinutes, setDurationMinutes] = useState(props.initialDurationMinutes);
  const [endDate, setEndDate] = useState(endDatePart || startDatePart);
  const [endTimeHour, setEndTimeHour] = useState(endHour);
  const [endTimeMinute, setEndTimeMinute] = useState(endMinute);
  const recalculateEndFromStart = (
    nextStartDate: string,
    nextStartHour: string,
    nextStartMinute: string,
    nextDurationMinutes: string,
  ) => {
    if (!nextStartDate || !nextStartHour || !nextStartMinute) return;
    const parsedDuration = Number.parseInt(nextDurationMinutes, 10);
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) return;
    const start = new Date(`${nextStartDate}T${nextStartHour}:${nextStartMinute}`);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + parsedDuration * 60 * 1000);
    const localEnd = new Date(end.getTime() - end.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEndDate(localEnd.slice(0, 10));
    setEndTimeHour(localEnd.slice(11, 13));
    setEndTimeMinute(localEnd.slice(14, 16));
  };

  const programsForJob = useMemo(
    () => (jobId ? props.programs.filter((p) => p.jobId === jobId) : []),
    [jobId, props.programs],
  );
  const timeHourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")),
    [],
  );
  const timeMinuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")),
    [],
  );

  const selectedProgramId = programId && programsForJob.some((p) => p.id === programId) ? programId : "";
  const selectedAdditionalIds = useMemo(
    () => new Set(additionalClientIds.filter(Boolean)),
    [additionalClientIds],
  );
  const startAtValue = useMemo(() => {
    if (!startDate || !startTimeHour || !startTimeMinute) return "";
    return `${startDate}T${startTimeHour}:${startTimeMinute}`;
  }, [startDate, startTimeHour, startTimeMinute]);
  const endAtValue = useMemo(() => {
    if (!endDate || !endTimeHour || !endTimeMinute) return "";
    return `${endDate}T${endTimeHour}:${endTimeMinute}`;
  }, [endDate, endTimeHour, endTimeMinute]);

  return (
    <form
      action={props.action}
      className="grid w-full max-w-3xl gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
    >
      <input type="hidden" name="id" value={props.id} />
      <input type="hidden" name="redirect_on_success" value={props.redirectOnSuccess} />
      <input type="hidden" name="start_at" value={startAtValue} />
      <input type="hidden" name="end_at" value={endAtValue} />
      <label className="space-y-1">
        <span className="block text-xs text-slate-300">{props.labels.client}</span>
        <select
          name="client_id"
          required
          defaultValue={props.initialClientId}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value=""></option>
          {props.clients.map((cl) => (
            <option key={cl.id} value={cl.id}>
              {cl.label}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-2 md:col-span-2">
        {additionalClientIds.length > 0 ? (
          <span className="block text-xs text-slate-300">{props.labels.additionalClients}</span>
        ) : null}
        {additionalClientIds.map((clientId, index) => (
          <div key={`additional-client-${index}`} className="flex items-center gap-2">
            <select
              name="additional_client_ids"
              value={clientId}
              onChange={(e) => {
                const next = [...additionalClientIds];
                next[index] = e.target.value;
                setAdditionalClientIds(next);
              }}
              className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value=""></option>
              {props.clients.map((cl) => (
                <option
                  key={cl.id}
                  value={cl.id}
                  disabled={selectedAdditionalIds.has(cl.id) && cl.id !== clientId}
                >
                  {cl.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                setAdditionalClientIds((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
              }
              className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
            >
              {props.labels.remove}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setAdditionalClientIds((prev) => [...prev, ""])}
          className="text-sm text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline"
        >
          {props.labels.addAdditionalClient}
        </button>
      </div>
      <label className="space-y-1">
        <span className="block text-xs text-slate-300">{props.labels.job}</span>
        <select
          name="job_id"
          required
          value={jobId}
          onChange={(e) => {
            setJobId(e.target.value);
            setProgramId("");
          }}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          {props.jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="block text-xs text-slate-300">{props.labels.programOptional}</span>
        <select
          name="program_id"
          value={selectedProgramId}
          onChange={(e) => setProgramId(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value=""></option>
          {programsForJob.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="block text-xs text-slate-300">{props.labels.visitType}</span>
        <select
          name="visit_type"
          required
          defaultValue={props.initialVisitType}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          {props.visitOptions.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="block text-xs text-slate-300">{props.labels.status}</span>
        <select
          name="status"
          required
          defaultValue={props.initialStatus}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="scheduled">{props.labels.statusScheduled}</option>
          <option value="completed">{props.labels.statusCompleted}</option>
          <option value="cancelled">{props.labels.statusCancelled}</option>
        </select>
      </label>
      <label className="space-y-1 md:col-span-2">
        <span className="block text-xs text-slate-300">{props.labels.cancellationReason}</span>
        <input
          name="cancellation_reason"
          defaultValue={props.initialCancellationReason}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </label>
      <div className="space-y-1">
        <span className="block text-xs text-slate-300">{props.labels.startDateTime}</span>
        <div className="grid gap-2 sm:grid-cols-[11.5rem_8.5rem]">
          <HouseholdDateIsoControl
            valueIso={startDate}
            onIsoChange={(nextStartDate) => {
              setStartDate(nextStartDate);
              recalculateEndFromStart(
                nextStartDate,
                startTimeHour,
                startTimeMinute,
                durationMinutes,
              );
            }}
            required
            className="w-full self-end rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            aria-label={props.labels.startDate}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={startTimeHour}
              onChange={(e) => {
                const nextHour = e.target.value;
                setStartTimeHour(nextHour);
                recalculateEndFromStart(startDate, nextHour, startTimeMinute, durationMinutes);
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
              aria-label={`${props.labels.startTime} ${timeHourSuffix}`}
            >
              {timeHourOptions.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            <select
              value={startTimeMinute}
              onChange={(e) => {
                const nextMinute = e.target.value;
                setStartTimeMinute(nextMinute);
                recalculateEndFromStart(startDate, startTimeHour, nextMinute, durationMinutes);
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
              aria-label={`${props.labels.startTime} ${timeMinuteSuffix}`}
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
      <label className="space-y-1">
        <span className="block text-xs text-slate-300">{props.labels.durationMinutes}</span>
        <input
          name="duration_minutes"
          type="number"
          min={1}
          max={999}
          step={1}
          value={durationMinutes}
          onChange={(e) => {
            const nextDuration = e.target.value;
            setDurationMinutes(nextDuration);
            recalculateEndFromStart(startDate, startTimeHour, startTimeMinute, nextDuration);
          }}
          className="w-full max-w-32 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </label>
      <div className="space-y-1">
        <span className="block text-xs text-slate-300">{props.labels.endOptional}</span>
        <div className="grid gap-2 sm:grid-cols-[11.5rem_8.5rem]">
          <HouseholdDateIsoControl
            valueIso={endDate}
            onIsoChange={setEndDate}
            className="w-full self-end rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            aria-label={props.labels.endOptional}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={endTimeHour}
              onChange={(e) => setEndTimeHour(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
              aria-label={`${props.labels.endOptional} ${timeHourSuffix}`}
            >
              {timeHourOptions.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            <select
              value={endTimeMinute}
              onChange={(e) => setEndTimeMinute(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
              aria-label={`${props.labels.endOptional} ${timeMinuteSuffix}`}
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
      <button
        type="submit"
        className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 md:col-span-2"
      >
        {props.labels.save}
      </button>
    </form>
  );
}
