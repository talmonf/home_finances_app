"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultClinicJobId } from "@/lib/private-clinic/default-clinic-job-id";
import { therapyLocalizedCategoryName } from "@/lib/therapy-localized-name";
import {
  resolveConsultationTypeDefault,
  type ConsultationTypeDefaultRow,
} from "@/lib/therapy/consultation-type-defaults";

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

type ConsultationTypeOption = { id: string; name: string; name_he: string | null };

type ConsultationFeeState = {
  typeId: string;
  setTypeId: (typeId: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
  currency: string;
  setCurrency: (currency: string) => void;
};

const ConsultationFeeContext = createContext<ConsultationFeeState | null>(null);

export function ConsultationTypeSelect({
  types,
  label,
  uiLanguage,
}: {
  types: ConsultationTypeOption[];
  label: string;
  uiLanguage: "en" | "he";
}) {
  const fee = useContext(ConsultationFeeContext);
  if (!fee) return null;
  return (
    <div>
      <label className="block text-xs text-slate-400">{label}</label>
      <select
        name="consultation_type_id"
        required
        value={fee.typeId}
        onChange={(e) => fee.setTypeId(e.target.value)}
        className="mt-1 w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      >
        <option value="">{uiLanguage === "he" ? "בחר..." : "Select..."}</option>
        {types.map((type) => (
          <option key={type.id} value={type.id}>
            {therapyLocalizedCategoryName(type, uiLanguage)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ConsultationAmountFields({ label }: { label: string }) {
  const fee = useContext(ConsultationFeeContext);
  if (!fee) return null;
  return (
    <div>
      <label className="block text-xs text-slate-400">{label}</label>
      <div className="mt-1 flex gap-2">
        <input
          name="amount"
          value={fee.amount}
          onChange={(e) => fee.setAmount(e.target.value)}
          placeholder="0.00"
          className="w-28 max-w-[9rem] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
        <input
          name="currency"
          value={fee.currency}
          onChange={(e) => fee.setCurrency(e.target.value)}
          className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
        />
      </div>
    </div>
  );
}

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
  initialTypeId,
  initialAmount,
  initialCurrency,
  typeDefaults = [],
  labels,
  scheduleDuration,
  inlineDuration = false,
  children,
}: {
  jobs: JobOption[];
  programs: ProgramOption[];
  initialJobId?: string;
  initialProgramId?: string;
  initialTypeId?: string;
  initialAmount?: string;
  initialCurrency?: string;
  typeDefaults?: ConsultationTypeDefaultRow[];
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
  const startingJobId = defaultClinicJobId(jobs, initialJobId);
  const startingTypeId = initialTypeId ?? "";
  const hasSavedAmount = (initialAmount ?? "").trim() !== "";
  const initialResolved =
    !hasSavedAmount && startingJobId && startingTypeId
      ? resolveConsultationTypeDefault(typeDefaults, startingJobId, initialProgramId ?? "", startingTypeId)
      : null;
  const [jobId, setJobId] = useState(startingJobId);
  const [programId, setProgramId] = useState(initialProgramId ?? "");
  const [typeId, setTypeIdState] = useState(startingTypeId);
  const [amount, setAmount] = useState(hasSavedAmount ? (initialAmount ?? "") : (initialResolved?.amount ?? ""));
  const [currency, setCurrency] = useState(
    hasSavedAmount
      ? initialCurrency?.trim() || "ILS"
      : initialResolved?.currency ?? (initialCurrency?.trim() || "ILS"),
  );
  const [durationMinutes, setDurationMinutes] = useState(
    () => scheduleDuration?.initialMinutes ?? scheduleDuration?.fallbackMinutes ?? 50,
  );

  const applyDefault = useCallback(
    (nextJobId: string, nextProgramId: string, nextTypeId: string) => {
      const resolved = resolveConsultationTypeDefault(typeDefaults, nextJobId, nextProgramId, nextTypeId);
      if (!resolved) return;
      setAmount(resolved.amount);
      setCurrency(resolved.currency);
    },
    [typeDefaults],
  );

  const setTypeId = useCallback(
    (nextTypeId: string) => {
      setTypeIdState(nextTypeId);
      applyDefault(jobId, programId, nextTypeId);
    },
    [applyDefault, jobId, programId],
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
  const feeState = useMemo<ConsultationFeeState>(
    () => ({ typeId, setTypeId, amount, setAmount, currency, setCurrency }),
    [amount, currency, setTypeId, typeId],
  );

  return (
    <ConsultationFeeContext.Provider value={feeState}>
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
            applyDefault(nextJobId, "", typeId);
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
            applyDefault(jobId, nextProgramId, typeId);
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
    </ConsultationFeeContext.Provider>
  );
}
