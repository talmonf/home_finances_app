"use client";

import { useMemo, useState } from "react";
import {
  createTherapyAppointment,
  createTherapyAppointmentSeries,
} from "../actions";
type JobOption = { id: string; label: string; defaultDurationMinutes: number | null };
type ProgramOption = { id: string; jobId: string; label: string; defaultDurationMinutes: number | null };
type ClientOption = {
  id: string;
  label: string;
  defaultJobId: string | null;
  defaultProgramId: string | null;
  defaultVisitType: string | null;
};
type DowOption = { v: number; label: string };
type VisitOption = { value: string; label: string };

type Props = {
  copy: {
    recurringToggle: string;
    clientLabel: string;
    jobLabel: string;
    programOptional: string;
    visitTypeLabel: string;
    recurrenceLabel: string;
    dayOfWeekLabel: string;
    startDateTimeLabel: string;
    startDateLabel: string;
    startTimeLabel: string;
    endDateTimeLabel: string;
    durationMinutesLabel: string;
    timeOfDayLabel: string;
    seriesStartDateLabel: string;
    seriesEndDateOptionalLabel: string;
    schedule: string;
    createSeriesGenerate: string;
    weekly: string;
    biweekly: string;
  };
  visitOptions: VisitOption[];
  jobs: JobOption[];
  programs: ProgramOption[];
  clients: ClientOption[];
  dow: DowOption[];
  redirectOnSuccess: string;
  prefill?: {
    clientId?: string;
    jobId?: string;
    programId?: string;
    visitType?: string;
    startDate?: string;
    durationMinutes?: string;
  };
  allowRecurring?: boolean;
};

export function AppointmentAddForm({
  copy,
  visitOptions,
  jobs,
  programs,
  clients,
  dow,
  redirectOnSuccess,
  prefill,
  allowRecurring = true,
}: Props) {
  const [recurring, setRecurring] = useState(false);
  const [singleClientId, setSingleClientId] = useState(prefill?.clientId ?? "");
  const [seriesClientId, setSeriesClientId] = useState(prefill?.clientId ?? "");
  const [singleJobId, setSingleJobId] = useState(prefill?.jobId ?? "");
  const [singleProgramId, setSingleProgramId] = useState(prefill?.programId ?? "");
  const [seriesJobId, setSeriesJobId] = useState(prefill?.jobId ?? "");
  const [seriesProgramId, setSeriesProgramId] = useState(prefill?.programId ?? "");
  const [singleVisitType, setSingleVisitType] = useState(prefill?.visitType ?? "");
  const [seriesVisitType, setSeriesVisitType] = useState(prefill?.visitType ?? "");
  const [singleStartDate, setSingleStartDate] = useState(prefill?.startDate ?? "");
  const [singleStartTime, setSingleStartTime] = useState("");
  const [singleDurationMinutes, setSingleDurationMinutes] = useState(prefill?.durationMinutes ?? "");

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );

  const singlePrograms = useMemo(
    () => (singleJobId ? programs.filter((p) => p.jobId === singleJobId) : []),
    [programs, singleJobId],
  );
  const seriesPrograms = useMemo(
    () => (seriesJobId ? programs.filter((p) => p.jobId === seriesJobId) : []),
    [programs, seriesJobId],
  );
  const programById = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);
  const jobById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const selectedJobDefaultDuration = singleJobId
    ? jobById.get(singleJobId)?.defaultDurationMinutes ?? null
    : null;

  const startAtValue = useMemo(() => {
    if (!singleStartDate || !singleStartTime) return "";
    return `${singleStartDate}T${singleStartTime}`;
  }, [singleStartDate, singleStartTime]);

  const endAtValue = useMemo(() => {
    if (!startAtValue) return "";
    const parsedDuration = Number.parseInt(singleDurationMinutes, 10);
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) return "";
    const start = new Date(startAtValue);
    if (Number.isNaN(start.getTime())) return "";
    const end = new Date(start.getTime() + parsedDuration * 60 * 1000);
    const local = new Date(end.getTime() - end.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }, [singleDurationMinutes, startAtValue]);
  const endDateValue = endAtValue ? endAtValue.slice(0, 10) : "";
  const endTimeValue = endAtValue ? endAtValue.slice(11, 16) : "";

  return (
    <div className="space-y-4">
      {allowRecurring ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="rounded border-slate-600"
          />
          {copy.recurringToggle}
        </label>
      ) : null}

      {!recurring ? (
        <form
          action={createTherapyAppointment}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
          <input type="hidden" name="start_at" value={startAtValue} />
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.clientLabel}</span>
            <select
              name="client_id"
              required
              value={singleClientId}
              onChange={(e) => {
                const nextClientId = e.target.value;
                setSingleClientId(nextClientId);
                const selectedClient = clientById.get(nextClientId);
                if (!selectedClient) return;
                if (!singleJobId && selectedClient.defaultJobId) {
                  setSingleJobId(selectedClient.defaultJobId);
                  setSingleProgramId(selectedClient.defaultProgramId ?? "");
                  if (selectedClient.defaultVisitType) setSingleVisitType(selectedClient.defaultVisitType);
                  const selectedProgramDuration = selectedClient.defaultProgramId
                    ? programById.get(selectedClient.defaultProgramId)?.defaultDurationMinutes ?? null
                    : null;
                  const selectedJobDuration =
                    jobById.get(selectedClient.defaultJobId)?.defaultDurationMinutes ?? null;
                  const nextDuration = selectedProgramDuration ?? selectedJobDuration;
                  if (nextDuration && nextDuration > 0) setSingleDurationMinutes(String(nextDuration));
                }
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value=""></option>
              {clients.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.jobLabel}</span>
            <select
              name="job_id"
              required
              value={singleJobId}
              onChange={(e) => {
                const nextJobId = e.target.value;
                setSingleJobId(nextJobId);
                setSingleProgramId("");
                const nextDuration = nextJobId
                  ? jobById.get(nextJobId)?.defaultDurationMinutes ?? null
                  : null;
                if (nextDuration && nextDuration > 0) setSingleDurationMinutes(String(nextDuration));
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value=""></option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.programOptional}</span>
            <select
              name="program_id"
              value={singleProgramId}
              onChange={(e) => {
                const nextProgramId = e.target.value;
                setSingleProgramId(nextProgramId);
                const programDuration = nextProgramId
                  ? programById.get(nextProgramId)?.defaultDurationMinutes ?? null
                  : null;
                const nextDuration = programDuration ?? selectedJobDefaultDuration;
                if (nextDuration && nextDuration > 0) setSingleDurationMinutes(String(nextDuration));
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value=""></option>
              {singlePrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.visitTypeLabel}</span>
            <select
              name="visit_type"
              required
              value={singleVisitType}
              onChange={(e) => setSingleVisitType(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value=""></option>
              {visitOptions.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.startDateTimeLabel}</span>
            <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_5.5rem]">
              <input
                name="start_date"
                type="date"
                value={singleStartDate}
                onChange={(e) => setSingleStartDate(e.target.value)}
                required
                className="w-full self-end rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                aria-label={copy.startDateLabel}
              />
              <input
                name="start_time"
                type="time"
                value={singleStartTime}
                onChange={(e) => setSingleStartTime(e.target.value)}
                required
                className="w-full max-w-36 self-end rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                aria-label={copy.startTimeLabel}
              />
              <label className="space-y-1">
                <span className="block text-xs text-slate-300">{copy.durationMinutesLabel}</span>
                <input
                  name="duration_minutes"
                  type="number"
                  min={1}
                  max={999}
                  step={1}
                  required
                  value={singleDurationMinutes}
                  onChange={(e) => setSingleDurationMinutes(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </label>
            </div>
          </div>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.endDateTimeLabel}</span>
            <input type="hidden" name="end_at" value={endAtValue} />
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
              <input
                type="date"
                value={endDateValue}
                readOnly
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                aria-label={copy.startDateLabel}
              />
              <input
                type="time"
                value={endTimeValue}
                readOnly
                className="w-full max-w-36 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                aria-label={copy.startTimeLabel}
              />
            </div>
          </label>
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {copy.schedule}
          </button>
        </form>
      ) : allowRecurring ? (
        <form
          action={createTherapyAppointmentSeries}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.clientLabel}</span>
            <select
              name="client_id"
              required
              value={seriesClientId}
              onChange={(e) => {
                const nextClientId = e.target.value;
                setSeriesClientId(nextClientId);
                const selectedClient = clientById.get(nextClientId);
                if (!selectedClient) return;
                if (!seriesJobId && selectedClient.defaultJobId) {
                  setSeriesJobId(selectedClient.defaultJobId);
                  setSeriesProgramId(selectedClient.defaultProgramId ?? "");
                  if (selectedClient.defaultVisitType) setSeriesVisitType(selectedClient.defaultVisitType);
                }
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value=""></option>
              {clients.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.jobLabel}</span>
            <select
              name="job_id"
              required
              value={seriesJobId}
              onChange={(e) => {
                setSeriesJobId(e.target.value);
                setSeriesProgramId("");
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value=""></option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.programOptional}</span>
            <select
              name="program_id"
              value={seriesProgramId}
              onChange={(e) => setSeriesProgramId(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value=""></option>
              {seriesPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.visitTypeLabel}</span>
            <select
              name="visit_type"
              required
              value={seriesVisitType}
              onChange={(e) => setSeriesVisitType(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value=""></option>
              {visitOptions.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.recurrenceLabel}</span>
            <select
              name="recurrence"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="weekly">{copy.weekly}</option>
              <option value="biweekly">{copy.biweekly}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.dayOfWeekLabel}</span>
            <select
              name="day_of_week"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {dow.map((d) => (
                <option key={d.v} value={d.v}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.timeOfDayLabel}</span>
            <input
              name="time_of_day"
              type="time"
              required
              className="w-full max-w-36 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.seriesStartDateLabel}</span>
            <input
              name="start_date"
              type="date"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.seriesEndDateOptionalLabel}</span>
            <input
              name="end_date"
              type="date"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {copy.createSeriesGenerate}
          </button>
        </form>
      ) : null}
    </div>
  );
}
