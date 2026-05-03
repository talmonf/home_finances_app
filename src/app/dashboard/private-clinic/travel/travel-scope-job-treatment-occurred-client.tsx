"use client";

import { useCallback, useState } from "react";
import { SplitDateTimeField } from "@/components/split-datetime-field";
import type { UiLanguage } from "@/lib/ui-language";

type JobOption = { id: string; label: string };
export type TreatmentTravelOption = { id: string; label: string; occurredAtYmd: string };

type TravelOccurrenceInitial = {
  link_scope: "job" | "treatment";
  job_id: string;
  treatment_id: string;
  occurred_at: string;
};

export function TravelScopeJobTreatmentOccurredFields({
  jobOptions,
  treatmentOptions,
  uiLanguage,
  initial,
  relatedJobLabel,
  relatedTreatmentLabel,
  jobPlaceholder,
  treatmentPlaceholder,
}: {
  jobOptions: JobOption[];
  treatmentOptions: TreatmentTravelOption[];
  uiLanguage: UiLanguage;
  initial?: TravelOccurrenceInitial;
  relatedJobLabel: string;
  relatedTreatmentLabel: string;
  jobPlaceholder: string;
  treatmentPlaceholder: string;
}) {
  const [scope, setScope] = useState<"job" | "treatment">(initial?.link_scope === "treatment" ? "treatment" : "job");
  const [jobId, setJobId] = useState(initial?.job_id ?? "");
  const [treatmentId, setTreatmentId] = useState(initial?.treatment_id ?? "");
  const [occurredInitial, setOccurredInitial] = useState(initial?.occurred_at ?? "");
  const [occurredFieldTick, setOccurredFieldTick] = useState(0);

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

  const onScopeJob = () => {
    setScope("job");
  };

  const onScopeTreatment = () => {
    setScope("treatment");
    if (treatmentId) applyTreatmentDate(treatmentId);
  };

  const onTreatmentChange = (nextId: string) => {
    setTreatmentId(nextId);
    if (scope === "treatment" && nextId) applyTreatmentDate(nextId);
  };

  return (
    <>
      <div className="md:col-span-2 flex flex-wrap gap-4 text-sm text-slate-300">
        <label className="flex items-center gap-2">
          <input type="radio" name="link_scope" value="job" checked={scope === "job"} onChange={onScopeJob} />
          {relatedJobLabel}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="link_scope"
            value="treatment"
            checked={scope === "treatment"}
            onChange={onScopeTreatment}
          />
          {relatedTreatmentLabel}
        </label>
      </div>
      <select
        name="job_id"
        value={jobId}
        onChange={(e) => setJobId(e.target.value)}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      >
        <option value="">{jobPlaceholder}</option>
        {jobOptions.map((job) => (
          <option key={job.id} value={job.id}>
            {job.label}
          </option>
        ))}
      </select>
      <select
        name="treatment_id"
        value={treatmentId}
        onChange={(e) => onTreatmentChange(e.target.value)}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      >
        <option value="">{treatmentPlaceholder}</option>
        {treatmentOptions.map((treatment) => (
          <option key={treatment.id} value={treatment.id}>
            {treatment.label}
          </option>
        ))}
      </select>
      <SplitDateTimeField key={occurredFieldTick} name="occurred_at" uiLanguage={uiLanguage} initialValue={occurredInitial} />
    </>
  );
}
