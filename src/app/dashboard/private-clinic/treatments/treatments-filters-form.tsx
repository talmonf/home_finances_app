"use client";

import { useMemo, useState } from "react";

type Option = { id: string; label: string };
type ProgramOption = { id: string; jobId: string; label: string };

type Props = {
  method?: "get" | "post";
  action?: string;
  paid: string;
  reported: string;
  job: string;
  program: string;
  client: string;
  family: string;
  from: string;
  to: string;
  receipt?: string;
  showExternalReporting: boolean;
  familyEnabled: boolean;
  jobs: Option[];
  programs: ProgramOption[];
  clients: Array<Option & { inactive?: boolean }>;
  families: Option[];
  labels: {
    filters: string;
    payment: string;
    externalReporting: string;
    filterPaid: string;
    filterPartial: string;
    filterUnpaid: string;
    filterReported: string;
    filterNotReported: string;
    job: string;
    program: string;
    client: string;
    from: string;
    to: string;
    apply: string;
    all: string;
    any: string;
    anyF: string;
    inactive: string;
    family: string;
  };
};

export function TreatmentsFiltersForm(props: Props) {
  const [jobId, setJobId] = useState(props.job);
  const [programId, setProgramId] = useState(props.program);

  const programsForJob = useMemo(
    () => (jobId ? props.programs.filter((p) => p.jobId === jobId) : props.programs),
    [jobId, props.programs],
  );

  const selectedProgramId = programId && programsForJob.some((p) => p.id === programId) ? programId : "";

  return (
    <fieldset className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 pb-2 pt-1">
      <legend className="px-1 text-xs font-medium text-slate-300">{props.labels.filters}</legend>
      <form
        className="flex flex-wrap items-end gap-1.5"
        method={props.method ?? "get"}
        action={props.action}
      >
        {props.receipt ? <input type="hidden" name="receipt" value={props.receipt} /> : null}

      <div className="flex-none">
        <label className="block text-[11px] leading-4 text-slate-400">{props.labels.payment}</label>
        <select
          name="paid"
          defaultValue={props.paid}
          className="w-auto min-w-[6.5rem] rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        >
          <option value="all">{props.labels.all}</option>
          <option value="paid">{props.labels.filterPaid}</option>
          <option value="partial">{props.labels.filterPartial}</option>
          <option value="unpaid">{props.labels.filterUnpaid}</option>
        </select>
      </div>

      {props.showExternalReporting ? (
        <div className="flex-none">
          <label className="block text-[11px] leading-4 text-slate-400">{props.labels.externalReporting}</label>
          <select
            name="reported"
            defaultValue={props.reported}
            className="w-auto min-w-[7rem] rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            <option value="all">{props.labels.all}</option>
            <option value="reported">{props.labels.filterReported}</option>
            <option value="not_reported">{props.labels.filterNotReported}</option>
          </select>
        </div>
      ) : null}

      <div className="flex-none">
        <label className="block text-[11px] leading-4 text-slate-400">{props.labels.job}</label>
        <select
          name="job"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className="w-auto min-w-[8rem] max-w-[12rem] rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        >
          <option value="">{props.labels.any}</option>
          {props.jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-none">
        <label className="block text-[11px] leading-4 text-slate-400">{props.labels.program}</label>
        <select
          name="program"
          value={selectedProgramId}
          onChange={(e) => setProgramId(e.target.value)}
          className="w-auto min-w-[7.5rem] max-w-[11rem] rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        >
          <option value="">{props.labels.anyF}</option>
          {programsForJob.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-none">
        <label className="block text-[11px] leading-4 text-slate-400">{props.labels.client}</label>
        <select
          name="client"
          defaultValue={props.client}
          className="w-auto min-w-[8rem] max-w-[12rem] rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        >
          <option value="">{props.labels.any}</option>
          {props.clients.map((cl) => (
            <option key={cl.id} value={cl.id}>
              {cl.label}
              {cl.inactive ? ` (${props.labels.inactive})` : ""}
            </option>
          ))}
        </select>
      </div>

      {props.familyEnabled ? (
        <div className="flex-none">
          <label className="block text-[11px] leading-4 text-slate-400">{props.labels.family}</label>
          <select
            name="family"
            defaultValue={props.family}
            className="w-auto min-w-[7rem] max-w-[10rem] rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            <option value="">{props.labels.any}</option>
            {props.families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex-none">
        <label className="block text-[11px] leading-4 text-slate-400">{props.labels.from}</label>
        <input
          name="from"
          type="date"
          defaultValue={props.from}
          className="w-auto min-w-[8rem] rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        />
      </div>

      <div className="flex-none">
        <label className="block text-[11px] leading-4 text-slate-400">{props.labels.to}</label>
        <input
          name="to"
          type="date"
          defaultValue={props.to}
          className="w-auto min-w-[8rem] rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        />
      </div>

      <div className="flex-none">
        <button
          type="submit"
          className="w-auto rounded-md bg-slate-700 px-2.5 py-1 text-xs text-slate-100 hover:bg-slate-600"
        >
          {props.labels.apply}
        </button>
      </div>
      </form>
    </fieldset>
  );
}
