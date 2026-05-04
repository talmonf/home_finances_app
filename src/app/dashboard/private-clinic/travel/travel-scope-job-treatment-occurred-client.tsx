"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SplitDateTimeField } from "@/components/split-datetime-field";
import type { UiLanguage } from "@/lib/ui-language";

type JobOption = { id: string; label: string };
export type TreatmentTravelOption = { id: string; jobId: string; label: string; occurredAtYmd: string };
export type ConsultationTravelOption = { id: string; jobId: string; label: string; occurredAtYmd: string };

type TravelOccurrenceInitial = {
  job_id: string;
  treatment_id: string;
  consultation_id: string;
  occurred_at: string;
};

export function TravelJobTreatmentConsultationOccurredFields({
  jobOptions,
  treatmentOptions,
  consultationOptions,
  uiLanguage,
  initial,
  jobLabel,
  treatmentLabel,
  consultationLabel,
  occurredAtLabel,
  jobPlaceholder,
  treatmentPlaceholder,
  consultationPlaceholder,
  chooseJobFirstHint,
}: {
  jobOptions: JobOption[];
  treatmentOptions: TreatmentTravelOption[];
  consultationOptions: ConsultationTravelOption[];
  uiLanguage: UiLanguage;
  initial?: TravelOccurrenceInitial;
  jobLabel: string;
  treatmentLabel: string;
  consultationLabel: string;
  occurredAtLabel: string;
  jobPlaceholder: string;
  treatmentPlaceholder: string;
  consultationPlaceholder: string;
  chooseJobFirstHint: string;
}) {
  const [jobId, setJobId] = useState(initial?.job_id ?? "");
  const [treatmentId, setTreatmentId] = useState(initial?.treatment_id ?? "");
  const [consultationId, setConsultationId] = useState(initial?.consultation_id ?? "");
  const [occurredInitial, setOccurredInitial] = useState(initial?.occurred_at ?? "");
  const [occurredFieldTick, setOccurredFieldTick] = useState(0);

  const treatmentsForJob = useMemo(
    () => treatmentOptions.filter((t) => !jobId || t.jobId === jobId),
    [jobId, treatmentOptions],
  );
  const consultationsForJob = useMemo(
    () => consultationOptions.filter((c) => !jobId || c.jobId === jobId),
    [jobId, consultationOptions],
  );

  const applyTreatmentDate = useCallback(
    (nextTreatmentId: string) => {
      if (!nextTreatmentId) return;
      const row = treatmentOptions.find((t) => t.id === nextTreatmentId);
      const ymd = row?.occurredAtYmd?.trim();
      if (!ymd) return;
      setOccurredInitial(ymd);
      setOccurredFieldTick((n) => n + 1);
    },
    [treatmentOptions],
  );

  const applyConsultationDate = useCallback(
    (nextConsultationId: string) => {
      if (!nextConsultationId) return;
      const row = consultationOptions.find((c) => c.id === nextConsultationId);
      const ymd = row?.occurredAtYmd?.trim();
      if (!ymd) return;
      setOccurredInitial(ymd);
      setOccurredFieldTick((n) => n + 1);
    },
    [consultationOptions],
  );

  useEffect(() => {
    if (treatmentId && !treatmentsForJob.some((t) => t.id === treatmentId)) {
      setTreatmentId("");
    }
  }, [treatmentId, treatmentsForJob]);

  useEffect(() => {
    if (consultationId && !consultationsForJob.some((c) => c.id === consultationId)) {
      setConsultationId("");
    }
  }, [consultationId, consultationsForJob]);

  const onJobChange = (nextJobId: string) => {
    setJobId(nextJobId);
    setTreatmentId("");
    setConsultationId("");
  };

  const onTreatmentChange = (nextId: string) => {
    setTreatmentId(nextId);
    if (nextId) {
      setConsultationId("");
      applyTreatmentDate(nextId);
    }
  };

  const onConsultationChange = (nextId: string) => {
    setConsultationId(nextId);
    if (nextId) {
      setTreatmentId("");
      applyConsultationDate(nextId);
    }
  };

  return (
    <>
      <div className="md:col-span-2 rounded-lg border border-slate-700/80 bg-slate-800/40 px-3 py-2 text-sm text-slate-300">
        {chooseJobFirstHint}
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-slate-400">{jobLabel}</label>
        <select
          name="job_id"
          required
          value={jobId}
          onChange={(e) => onJobChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{jobPlaceholder}</option>
          {jobOptions.map((job) => (
            <option key={job.id} value={job.id}>
              {job.label}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-slate-400">{treatmentLabel}</label>
        <select
          name="treatment_id"
          value={treatmentId}
          onChange={(e) => onTreatmentChange(e.target.value)}
          disabled={!jobId}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
        >
          <option value="">{treatmentPlaceholder}</option>
          {treatmentsForJob.map((treatment) => (
            <option key={treatment.id} value={treatment.id}>
              {treatment.label}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-slate-400">{consultationLabel}</label>
        <select
          name="consultation_id"
          value={consultationId}
          onChange={(e) => onConsultationChange(e.target.value)}
          disabled={!jobId}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
        >
          <option value="">{consultationPlaceholder}</option>
          {consultationsForJob.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-slate-400">{occurredAtLabel}</label>
        <div className="mt-1">
          <SplitDateTimeField key={occurredFieldTick} name="occurred_at" uiLanguage={uiLanguage} initialValue={occurredInitial} />
        </div>
      </div>
    </>
  );
}
