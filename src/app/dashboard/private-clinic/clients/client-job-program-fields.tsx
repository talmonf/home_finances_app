"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultClinicJobId } from "@/lib/private-clinic/default-clinic-job-id";

type JobOption = { id: string; label: string };
type ProgramOption = {
  id: string;
  jobId: string;
  label: string;
  visits_per_period_count: number | null;
  visits_per_period_weeks: number | null;
};

export type ClientJobProgramFieldLabels = {
  defaultJob: string;
  defaultProgramOptional: string;
  defaultVisitTypeOptional: string;
  defaultSessionLengthOptional: string;
  kupatHolimOptional: string;
  selectJob: string;
  none: string;
  alsoSeenUnder: string;
  visitClinic: string;
  visitHome: string;
  visitPhone: string;
  visitVideo: string;
  kupatClalit: string;
  kupatMaccabi: string;
  kupatMeuhedet: string;
  kupatLeumit: string;
};

const DEFAULT_LABELS: ClientJobProgramFieldLabels = {
  defaultJob: "Default job",
  defaultProgramOptional: "Default program (optional)",
  defaultVisitTypeOptional: "Default visit type (optional)",
  defaultSessionLengthOptional: "Default session length (minutes, optional)",
  kupatHolimOptional: "Kupat Holim (optional)",
  selectJob: "Select job",
  none: "None",
  alsoSeenUnder: "Also seen under these jobs (includes default)",
  visitClinic: "Clinic",
  visitHome: "Home",
  visitPhone: "Phone",
  visitVideo: "Video",
  kupatClalit: "Clalit",
  kupatMaccabi: "Maccabi",
  kupatMeuhedet: "Meuhedet",
  kupatLeumit: "Leumit",
};

export function ClientJobProgramFields({
  jobs,
  programs,
  defaultJobId,
  defaultProgramId,
  defaultVisitType,
  defaultSessionLengthMinutes,
  defaultKupatHolim,
  defaultCheckedJobIds,
  requiredProgram,
  inheritProgramVisitFrequency,
  visitFrequencyCountInputId,
  visitFrequencyWeeksInputId,
  labels = DEFAULT_LABELS,
}: {
  jobs: JobOption[];
  programs: ProgramOption[];
  defaultJobId?: string | null;
  defaultProgramId?: string | null;
  defaultVisitType?: "clinic" | "home" | "phone" | "video" | null;
  defaultSessionLengthMinutes?: number | null;
  defaultKupatHolim?: "clalit" | "maccabi" | "meuhedet" | "leumit" | null;
  defaultCheckedJobIds?: string[];
  requiredProgram?: boolean;
  inheritProgramVisitFrequency?: boolean;
  visitFrequencyCountInputId?: string;
  visitFrequencyWeeksInputId?: string;
  labels?: ClientJobProgramFieldLabels;
}) {
  const initialJobId = defaultClinicJobId(jobs, defaultJobId);
  const [jobId, setJobId] = useState(initialJobId);
  const [programId, setProgramId] = useState(defaultProgramId ?? "");
  const [checkedJobs, setCheckedJobs] = useState<Set<string>>(() => {
    const next = new Set(defaultCheckedJobIds ?? []);
    if (initialJobId) next.add(initialJobId);
    return next;
  });

  const kupatHolimOptions = useMemo(() => {
    // Keep UI ordering aligned with the displayed labels (works for both English and Hebrew).
    const opts = [
      { value: "clalit" as const, label: labels.kupatClalit },
      { value: "maccabi" as const, label: labels.kupatMaccabi },
      { value: "meuhedet" as const, label: labels.kupatMeuhedet },
      { value: "leumit" as const, label: labels.kupatLeumit },
    ];
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [labels]);

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

  useEffect(() => {
    if (!inheritProgramVisitFrequency || !visitFrequencyCountInputId || !visitFrequencyWeeksInputId) return;
    const prog = programs.find((x) => x.id === programId);
    const cEl = document.getElementById(visitFrequencyCountInputId) as HTMLInputElement | null;
    const wEl = document.getElementById(visitFrequencyWeeksInputId) as HTMLInputElement | null;
    if (!cEl || !wEl) return;
    if (
      prog &&
      prog.visits_per_period_count != null &&
      prog.visits_per_period_weeks != null
    ) {
      cEl.value = String(prog.visits_per_period_count);
      wEl.value = String(prog.visits_per_period_weeks);
    }
  }, [
    inheritProgramVisitFrequency,
    programId,
    programs,
    visitFrequencyCountInputId,
    visitFrequencyWeeksInputId,
  ]);

  return (
    <>
      <div className="space-y-1">
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

      <div className="space-y-1">
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

      <div className="space-y-1">
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

      <div className="space-y-1">
        <label className="block text-xs text-slate-400">{labels.defaultSessionLengthOptional}</label>
        <input
          name="default_session_length_minutes"
          type="number"
          min={1}
          max={999}
          step={1}
          defaultValue={defaultSessionLengthMinutes ?? ""}
          className="w-full max-w-32 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs text-slate-400">{labels.kupatHolimOptional}</label>
        <select
          name="kupat_holim"
          defaultValue={defaultKupatHolim ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{labels.none}</option>
          {kupatHolimOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
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
