"use client";

import { useMemo, useState } from "react";
import { HouseholdDateField } from "@/components/household-date-field";
import { FilterCheckboxDropdown } from "@/components/filter-checkbox-dropdown";
import { PrivateClinicFilterResetButton } from "@/components/private-clinic-filter-reset-button";
import { defaultClinicJobId } from "@/lib/private-clinic/default-clinic-job-id";

type Option = { id: string; label: string };
type ProgramOption = { id: string; jobId: string; label: string };

type Props = {
  action: string;
  job: string;
  programs: string[];
  from: string;
  to: string;
  jobs: Option[];
  programOptions: ProgramOption[];
  filterResetHref: string;
  filterResetLabel: string;
  labels: {
    filters: string;
    job: string;
    program: string;
    from: string;
    to: string;
    apply: string;
    any: string;
    anyF: string;
    selectedCountTemplate: string;
    selectAll: string;
    deselectAll: string;
    filterDone: string;
    filterCloseHint: string;
  };
};

export function DashboardFiltersForm(props: Props) {
  const [jobId, setJobId] = useState(() => defaultClinicJobId(props.jobs, props.job));
  const [programIds, setProgramIds] = useState(() => new Set(props.programs));

  const programsForJob = useMemo(
    () => (jobId ? props.programOptions.filter((p) => p.jobId === jobId) : props.programOptions),
    [jobId, props.programOptions],
  );

  const selectedProgramIds = useMemo(() => {
    const valid = new Set(programsForJob.map((p) => p.id));
    return new Set([...programIds].filter((id) => valid.has(id)));
  }, [programIds, programsForJob]);

  return (
    <fieldset className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 pb-2 pt-1">
      <legend className="px-1 text-xs font-medium text-slate-300">{props.labels.filters}</legend>
      <form className="flex flex-wrap items-end gap-x-2 gap-y-2" method="get" action={props.action}>
        <div className="flex-none">
          <label className="block text-[11px] leading-4 text-slate-400">{props.labels.job}</label>
          <select
            name="job"
            value={jobId}
            onChange={(e) => {
              const nextJobId = e.target.value;
              setJobId(nextJobId);
              const validProgramIds = new Set(
                (nextJobId
                  ? props.programOptions.filter((p) => p.jobId === nextJobId)
                  : props.programOptions
                ).map((p) => p.id),
              );
              setProgramIds((prev) => new Set([...prev].filter((id) => validProgramIds.has(id))));
            }}
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

        <FilterCheckboxDropdown
          name="program"
          label={props.labels.program}
          anyLabel={props.labels.anyF}
          options={programsForJob}
          selectedIds={selectedProgramIds}
          onChange={setProgramIds}
          selectedCountTemplate={props.labels.selectedCountTemplate}
          selectAllLabel={props.labels.selectAll}
          deselectAllLabel={props.labels.deselectAll}
          doneLabel={props.labels.filterDone}
          closeHint={props.labels.filterCloseHint}
        />

        <div className="flex-none">
          <label className="block text-[11px] leading-4 text-slate-400">{props.labels.from}</label>
          <div className="mt-0.5">
            <HouseholdDateField
              name="from"
              defaultIsoYmd={props.from}
              className="w-auto min-w-[8rem] rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
            />
          </div>
        </div>

        <div className="flex-none">
          <label className="block text-[11px] leading-4 text-slate-400">{props.labels.to}</label>
          <div className="mt-0.5">
            <HouseholdDateField
              name="to"
              defaultIsoYmd={props.to}
              className="w-auto min-w-[8rem] rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
            />
          </div>
        </div>

        <div className="flex flex-none shrink-0 items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-normal text-slate-100 hover:bg-slate-600"
          >
            {props.labels.apply}
          </button>
          <PrivateClinicFilterResetButton href={props.filterResetHref} label={props.filterResetLabel} />
        </div>
      </form>
    </fieldset>
  );
}
