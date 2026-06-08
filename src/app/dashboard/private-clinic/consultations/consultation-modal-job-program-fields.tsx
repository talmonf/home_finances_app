"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultClinicJobId } from "@/lib/private-clinic/default-clinic-job-id";

type JobOption = { id: string; label: string };
type ProgramOption = { id: string; jobId: string; label: string };

export function ConsultationModalJobProgramFields({
  jobs,
  programs,
  initialJobId,
  initialProgramId,
  labels,
}: {
  jobs: JobOption[];
  programs: ProgramOption[];
  initialJobId?: string;
  initialProgramId?: string;
  labels: {
    job: string;
    program: string;
    select: string;
  };
}) {
  const [jobId, setJobId] = useState(() => defaultClinicJobId(jobs, initialJobId));
  const [programId, setProgramId] = useState(initialProgramId ?? "");

  const programsForJob = useMemo(
    () => (jobId ? programs.filter((p) => p.jobId === jobId) : []),
    [programs, jobId],
  );

  useEffect(() => {
    if (programId && !programsForJob.some((p) => p.id === programId)) {
      setProgramId("");
    }
  }, [programsForJob, programId]);

  return (
    <>
      <div>
        <label className="block text-xs text-slate-400">{labels.job}</label>
        <select
          name="job_id"
          required
          value={jobId}
          onChange={(e) => {
            setJobId(e.target.value);
            setProgramId("");
          }}
          className="mt-1 w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{labels.select}</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400">{labels.program}</label>
        <select
          name="program_id"
          value={programId}
          required={programsForJob.length > 0}
          onChange={(e) => setProgramId(e.target.value)}
          className="mt-1 w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{labels.select}</option>
          {programsForJob.map((program) => (
            <option key={program.id} value={program.id}>
              {program.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
