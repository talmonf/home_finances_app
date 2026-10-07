"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultClinicJobId } from "@/lib/private-clinic/default-clinic-job-id";

type JobOption = { id: string; label: string };
type ProgramOption = { id: string; jobId: string; label: string };

type ScheduleDuration = {
  initialMinutes: number;
  fallbackMinutes: number;
  label: string;
  jobMinutes: Record<string, number>;
  programMinutes: Record<string, number>;
};

function durationForSelection(
  scheduleDuration: ScheduleDuration,
  jobId: string,
  programId: string,
): number {
  const programMinutes = programId ? scheduleDuration.programMinutes[programId] : undefined;
  const jobMinutes = jobId ? scheduleDuration.jobMinutes[jobId] : undefined;
  return programMinutes ?? jobMinutes ?? scheduleDuration.fallbackMinutes;
}

export function ConsultationModalJobProgramFields({
  jobs,
  programs,
  initialJobId,
  initialProgramId,
  labels,
  scheduleDuration,
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
  scheduleDuration?: ScheduleDuration;
}) {
  const [jobId, setJobId] = useState(() => defaultClinicJobId(jobs, initialJobId));
  const [programId, setProgramId] = useState(initialProgramId ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    () => scheduleDuration?.initialMinutes ?? scheduleDuration?.fallbackMinutes ?? 50,
  );

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
            const nextJobId = e.target.value;
            setJobId(nextJobId);
            setProgramId("");
            if (scheduleDuration) {
              setDurationMinutes(durationForSelection(scheduleDuration, nextJobId, ""));
            }
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
          onChange={(e) => {
            const nextProgramId = e.target.value;
            setProgramId(nextProgramId);
            if (scheduleDuration) {
              setDurationMinutes(durationForSelection(scheduleDuration, jobId, nextProgramId));
            }
          }}
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
      {scheduleDuration ? (
        <div>
          <label className="block text-xs text-slate-400">{scheduleDuration.label}</label>
          <input
            name="duration_minutes"
            type="number"
            min={1}
            max={999}
            step={1}
            required
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="mt-1 w-28 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      ) : null}
    </>
  );
}
