"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

type DurationFieldState = {
  label: string;
  minutes: number;
  setMinutes: (value: number) => void;
};

const ConsultationDurationContext = createContext<DurationFieldState | null>(null);

function DurationMinutesField({ label, minutes, setMinutes }: DurationFieldState) {
  return (
    <div>
      <label className="block text-xs text-slate-400">{label}</label>
      <input
        name="duration_minutes"
        type="number"
        min={1}
        max={999}
        step={1}
        required
        value={minutes}
        onChange={(e) => setMinutes(Number(e.target.value))}
        className="mt-1 w-28 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      />
    </div>
  );
}

/** Renders the schedule duration input beside the date and time. */
export function ConsultationScheduleDurationField() {
  const duration = useContext(ConsultationDurationContext);
  if (!duration) return null;
  return <DurationMinutesField {...duration} />;
}

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
  inlineDuration = false,
  children,
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
  /** Keep duration out of the job/program grid so it can sit on the date row. */
  inlineDuration?: boolean;
  children?: ReactNode;
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

  const durationState: DurationFieldState | null = scheduleDuration
    ? { label: scheduleDuration.label, minutes: durationMinutes, setMinutes: setDurationMinutes }
    : null;

  return (
    <ConsultationDurationContext.Provider value={durationState}>
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
      {scheduleDuration && !inlineDuration ? (
        <DurationMinutesField label={scheduleDuration.label} minutes={durationMinutes} setMinutes={setDurationMinutes} />
      ) : null}
      {children}
    </ConsultationDurationContext.Provider>
  );
}
