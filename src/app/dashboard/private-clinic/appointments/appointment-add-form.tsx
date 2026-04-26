"use client";

import { useMemo, useState } from "react";
import {
  createTherapyAppointment,
  createTherapyAppointmentSeries,
} from "../actions";
type JobOption = { id: string; label: string };
type ProgramOption = { id: string; jobId: string; label: string };
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
    jobSelect: string;
    programOptional: string;
    visitTypeLabel: string;
    recurrenceLabel: string;
    dayOfWeekLabel: string;
    startDateTimeLabel: string;
    endDateTimeOptionalLabel: string;
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
    startAt?: string;
  };
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
}: Props) {
  const [recurring, setRecurring] = useState(false);
  const [singleClientId, setSingleClientId] = useState(prefill?.clientId ?? "");
  const [seriesClientId, setSeriesClientId] = useState(prefill?.clientId ?? "");
  const [singleJobId, setSingleJobId] = useState(prefill?.jobId ?? "");
  const [singleProgramId, setSingleProgramId] = useState(prefill?.programId ?? "");
  const [seriesJobId, setSeriesJobId] = useState(prefill?.jobId ?? "");
  const [seriesProgramId, setSeriesProgramId] = useState(prefill?.programId ?? "");
  const [singleVisitType, setSingleVisitType] = useState(
    prefill?.visitType ?? visitOptions[0]?.value ?? "clinic",
  );
  const [seriesVisitType, setSeriesVisitType] = useState(
    prefill?.visitType ?? visitOptions[0]?.value ?? "clinic",
  );

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

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          className="rounded border-slate-600"
        />
        {copy.recurringToggle}
      </label>

      {!recurring ? (
        <form
          action={createTherapyAppointment}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
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
                }
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{copy.clientLabel}</option>
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
                setSingleJobId(e.target.value);
                setSingleProgramId("");
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{copy.jobSelect}</option>
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
              onChange={(e) => setSingleProgramId(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{copy.programOptional}</option>
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
              {visitOptions.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.startDateTimeLabel}</span>
            <input
              name="start_at"
              type="datetime-local"
              defaultValue={prefill?.startAt}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.endDateTimeOptionalLabel}</span>
            <input
              name="end_at"
              type="datetime-local"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {copy.schedule}
          </button>
        </form>
      ) : (
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
              <option value="">{copy.clientLabel}</option>
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
              <option value="">{copy.jobSelect}</option>
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
              <option value="">{copy.programOptional}</option>
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
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
      )}
    </div>
  );
}
