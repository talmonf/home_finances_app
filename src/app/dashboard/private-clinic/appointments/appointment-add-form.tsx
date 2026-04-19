"use client";

import { useState } from "react";
import {
  createTherapyAppointment,
  createTherapyAppointmentSeries,
} from "../actions";
type JobOption = { id: string; label: string };
type ProgramOption = { id: string; label: string };
type ClientOption = { id: string; label: string };
type DowOption = { v: number; label: string };
type VisitOption = { value: string; label: string };

type Props = {
  copy: {
    recurringToggle: string;
    programOptional: string;
    schedule: string;
    createSeriesGenerate: string;
    weekly: string;
    biweekly: string;
  };
  clientLabel: string;
  visitOptions: VisitOption[];
  jobs: JobOption[];
  programs: ProgramOption[];
  clients: ClientOption[];
  dow: DowOption[];
  redirectOnSuccess: string;
};

export function AppointmentAddForm({
  copy,
  visitOptions,
  jobs,
  programs,
  clients,
  dow,
  clientLabel,
  redirectOnSuccess,
}: Props) {
  const [recurring, setRecurring] = useState(false);

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
          <select
            name="client_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{clientLabel}</option>
            {clients.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.label}
              </option>
            ))}
          </select>
          <select
            name="job_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">—</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
          <select
            name="program_id"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{copy.programOptional}</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            name="visit_type"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            {visitOptions.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
          <input
            name="start_at"
            type="datetime-local"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="end_at"
            type="datetime-local"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
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
          <select
            name="client_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{clientLabel}</option>
            {clients.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.label}
              </option>
            ))}
          </select>
          <select
            name="job_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">—</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
          <select
            name="program_id"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{copy.programOptional}</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            name="visit_type"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            {visitOptions.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
          <select
            name="recurrence"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="weekly">{copy.weekly}</option>
            <option value="biweekly">{copy.biweekly}</option>
          </select>
          <select
            name="day_of_week"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            {dow.map((d) => (
              <option key={d.v} value={d.v}>
                {d.label}
              </option>
            ))}
          </select>
          <input
            name="time_of_day"
            type="time"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="start_date"
            type="date"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="end_date"
            type="date"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
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
