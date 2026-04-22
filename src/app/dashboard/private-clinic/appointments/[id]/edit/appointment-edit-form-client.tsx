"use client";

import { useMemo, useState } from "react";

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
  initialEndAt: string;
  labels: {
    client: string;
    programOptional: string;
    statusScheduled: string;
    statusCompleted: string;
    statusCancelled: string;
    cancel: string;
    save: string;
  };
  jobs: JobOption[];
  programs: ProgramOption[];
  clients: ClientOption[];
  visitOptions: VisitOption[];
};

export function AppointmentEditFormClient(props: Props) {
  const [jobId, setJobId] = useState(props.initialJobId);
  const [programId, setProgramId] = useState(props.initialProgramId);

  const programsForJob = useMemo(
    () => (jobId ? props.programs.filter((p) => p.jobId === jobId) : []),
    [jobId, props.programs],
  );

  const selectedProgramId = programId && programsForJob.some((p) => p.id === programId) ? programId : "";

  return (
    <form
      action={props.action}
      className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
    >
      <input type="hidden" name="id" value={props.id} />
      <input type="hidden" name="redirect_on_success" value={props.redirectOnSuccess} />
      <select
        name="client_id"
        required
        defaultValue={props.initialClientId}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      >
        <option value="">{props.labels.client}</option>
        {props.clients.map((cl) => (
          <option key={cl.id} value={cl.id}>
            {cl.label}
          </option>
        ))}
      </select>
      <select
        name="additional_client_ids"
        multiple
        defaultValue={props.initialAdditionalClientIds}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 md:col-span-2"
      >
        {props.clients.map((cl) => (
          <option key={cl.id} value={cl.id}>
            {cl.label}
          </option>
        ))}
      </select>
      <select
        name="job_id"
        required
        value={jobId}
        onChange={(e) => {
          setJobId(e.target.value);
          setProgramId("");
        }}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      >
        {props.jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.label}
          </option>
        ))}
      </select>
      <select
        name="program_id"
        value={selectedProgramId}
        onChange={(e) => setProgramId(e.target.value)}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      >
        <option value="">{props.labels.programOptional}</option>
        {programsForJob.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <select
        name="visit_type"
        required
        defaultValue={props.initialVisitType}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      >
        {props.visitOptions.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>
      <select
        name="status"
        required
        defaultValue={props.initialStatus}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      >
        <option value="scheduled">{props.labels.statusScheduled}</option>
        <option value="completed">{props.labels.statusCompleted}</option>
        <option value="cancelled">{props.labels.statusCancelled}</option>
      </select>
      <input
        name="cancellation_reason"
        placeholder={props.labels.cancel}
        defaultValue={props.initialCancellationReason}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      />
      <input
        name="end_at"
        type="datetime-local"
        defaultValue={props.initialEndAt}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      />
      <button
        type="submit"
        className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
      >
        {props.labels.save}
      </button>
    </form>
  );
}
