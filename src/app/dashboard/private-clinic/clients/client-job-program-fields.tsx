"use client";

import { useEffect, useMemo, useState } from "react";

type JobOption = { id: string; label: string };
type ProgramOption = { id: string; jobId: string; label: string };

export type ClientJobProgramFieldLabels = {
  defaultJob: string;
  defaultProgramOptional: string;
  defaultVisitTypeOptional: string;
  selectJob: string;
  none: string;
  alsoSeenUnder: string;
  visitClinic: string;
  visitHome: string;
  visitPhone: string;
  visitVideo: string;
};

const DEFAULT_LABELS: ClientJobProgramFieldLabels = {
  defaultJob: "Default job",
  defaultProgramOptional: "Default program (optional)",
  defaultVisitTypeOptional: "Default visit type (optional)",
  selectJob: "Select job",
  none: "None",
  alsoSeenUnder: "Also seen under these jobs (includes default)",
  visitClinic: "Clinic",
  visitHome: "Home",
  visitPhone: "Phone",
  visitVideo: "Video",
};

export function ClientJobProgramFields({
  jobs,
  programs,
  defaultJobId,
  defaultProgramId,
  defaultVisitType,
  defaultCheckedJobIds,
  requiredProgram,
  labels = DEFAULT_LABELS,
}: {
  jobs: JobOption[];
  programs: ProgramOption[];
  defaultJobId?: string | null;
  defaultProgramId?: string | null;
  defaultVisitType?: "clinic" | "home" | "phone" | "video" | null;
  defaultCheckedJobIds?: string[];
  requiredProgram?: boolean;
  labels?: ClientJobProgramFieldLabels;
}) {
  const [jobId, setJobId] = useState(defaultJobId ?? "");
  const [programId, setProgramId] = useState(defaultProgramId ?? "");
  const [checkedJobs, setCheckedJobs] = useState<Set<string>>(new Set(defaultCheckedJobIds ?? []));

  const filteredPrograms = useMemo(
    () => (jobId ? programs.filter((p) => p.jobId === jobId) : []),
    [programs, jobId],
  );

  useEffect(() => {
    if (jobId) {
      setCheckedJobs((prev) => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
    }
  }, [jobId]);

  useEffect(() => {
    if (programId) {
      const p = programs.find((x) => x.id === programId);
      if (p && p.jobId !== jobId) {
        setJobId(p.jobId);
      }
    }
  }, [programId, jobId, programs]);

  useEffect(() => {
    if (programId && !filteredPrograms.some((p) => p.id === programId)) {
      setProgramId("");
    }
  }, [filteredPrograms, programId]);

  return (
    <>
      <div className="md:col-span-2 space-y-1">
        <label className="block text-xs text-slate-400">{labels.defaultJob}</label>
        <select
          name="default_job_id"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{labels.selectJob}</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.label}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2 space-y-1">
        <label className="block text-xs text-slate-400">{labels.defaultProgramOptional}</label>
        <select
          name="default_program_id"
          value={programId}
          onChange={(e) => setProgramId(e.target.value)}
          required={!!requiredProgram}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{labels.none}</option>
          {filteredPrograms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2 space-y-1">
        <label className="block text-xs text-slate-400">{labels.defaultVisitTypeOptional}</label>
        <select
          name="default_visit_type"
          defaultValue={defaultVisitType ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{labels.none}</option>
          <option value="clinic">{labels.visitClinic}</option>
          <option value="home">{labels.visitHome}</option>
          <option value="phone">{labels.visitPhone}</option>
          <option value="video">{labels.visitVideo}</option>
        </select>
      </div>

      <div className="md:col-span-2 space-y-2">
        <p className="text-xs text-slate-400">{labels.alsoSeenUnder}</p>
        <div className="flex flex-wrap gap-3">
          {jobs.map((j) => (
            <label key={j.id} className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="job_ids"
                value={j.id}
                checked={checkedJobs.has(j.id)}
                onChange={(e) =>
                  setCheckedJobs((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(j.id);
                    else next.delete(j.id);
                    return next;
                  })
                }
              />
              {j.label}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
