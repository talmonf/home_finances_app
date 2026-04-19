"use client";

import { useCallback, useMemo, useState } from "react";
import type { TherapyVisitType } from "@/generated/prisma/enums";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import type { UiLanguage } from "@/lib/ui-language";
import {
  resolveTherapyVisitTypeDefault,
  therapyVisitTypesOrdered,
  type VisitTypeDefaultRow,
} from "@/lib/therapy/visit-type-defaults";

type JobOpt = { id: string; job_title: string };
type ProgramOpt = { id: string; job_id: string; name: string; job: { job_title: string } };

/** Client-only: applies job/program/visit-type default amounts when logging a treatment. */
export function TherapyTreatmentDefaultAmountFields(props: {
  uiLanguage: UiLanguage;
  jobs: JobOpt[];
  programs: ProgramOpt[];
  visitDefaults: VisitTypeDefaultRow[];
  labels: {
    job: string;
    program: string;
    date: string;
    timeOptional: string;
    amount: string;
    currency: string;
    visitType: string;
    select: string;
  };
  clients: {
    id: string;
    default_job_id: string;
    default_program_id: string | null;
    default_visit_type: TherapyVisitType | null;
  }[];
  defaultClientId?: string;
  defaultValues?: {
    job_id?: string;
    program_id?: string;
    occurred_date?: string;
    occurred_time?: string;
    amount?: string;
    currency?: string;
    visit_type?: TherapyVisitType;
  };
}) {
  const { visitDefaults, jobs, programs, labels, uiLanguage, defaultValues, clients, defaultClientId } = props;
  const defaultClient = clients.find((cl) => cl.id === defaultClientId);

  const firstJobId = defaultValues?.job_id || defaultClient?.default_job_id || "";
  const programsForFirst = useMemo(
    () => programs.filter((p) => p.job_id === firstJobId),
    [programs, firstJobId],
  );
  const requestedProgramId = defaultValues?.program_id || defaultClient?.default_program_id || "";
  const initialProgramId =
    (requestedProgramId && programs.some((p) => p.id === requestedProgramId) ? requestedProgramId : "") ||
    programsForFirst[0]?.id ||
    "";

  const initialVisit: TherapyVisitType | "" =
    defaultValues?.visit_type ??
    defaultClient?.default_visit_type ??
    (defaultClient ? "clinic" : "");
  const initialResolved = initialVisit
    ? resolveTherapyVisitTypeDefault(
        visitDefaults,
        firstJobId,
        initialProgramId,
        initialVisit,
      )
    : null;

  const [jobId, setJobId] = useState(firstJobId);
  const [programId, setProgramId] = useState(initialProgramId);
  const [visitType, setVisitType] = useState<TherapyVisitType | "">(initialVisit);
  const [amount, setAmount] = useState(defaultValues?.amount ?? initialResolved?.amount ?? "");
  const [currency, setCurrency] = useState(defaultValues?.currency ?? initialResolved?.currency ?? "ILS");

  const programsForJob = useMemo(() => programs.filter((p) => p.job_id === jobId), [programs, jobId]);

  const applyDefault = useCallback(
    (j: string, p: string, vt: TherapyVisitType | "") => {
      if (!vt) return;
      const d = resolveTherapyVisitTypeDefault(visitDefaults, j, p, vt);
      if (d) {
        setAmount(d.amount);
        setCurrency(d.currency);
      }
    },
    [visitDefaults],
  );

  const onJobChange = (nextJobId: string) => {
    setJobId(nextJobId);
    const nextPrograms = programs.filter((x) => x.job_id === nextJobId);
    const nextProg = nextPrograms[0]?.id ?? "";
    setProgramId(nextProg);
    applyDefault(nextJobId, nextProg, visitType);
  };

  const onProgramChange = (nextProgramId: string) => {
    setProgramId(nextProgramId);
    applyDefault(jobId, nextProgramId, visitType);
  };

  const onVisitTypeChange = (vt: TherapyVisitType | "") => {
    setVisitType(vt);
    applyDefault(jobId, programId, vt);
  };

  const visitOptions = therapyVisitTypesOrdered();

  return (
    <>
      <div>
        <label className="block text-xs text-slate-400">{labels.job}</label>
        <select
          name="job_id"
          required
          value={jobId}
          onChange={(e) => onJobChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{labels.select}</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.job_title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400">{labels.program}</label>
        <select
          name="program_id"
          required={programsForJob.length > 0}
          value={programId}
          onChange={(e) => onProgramChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{labels.select}</option>
          {programsForJob.map((p) => (
            <option key={p.id} value={p.id}>
              {p.job.job_title} — {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400">{labels.visitType}</label>
        <select
          name="visit_type"
          required
          value={visitType}
          onChange={(e) => onVisitTypeChange(e.target.value as TherapyVisitType | "")}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{labels.select}</option>
          {visitOptions.map((v) => (
            <option key={v} value={v}>
              {therapyVisitTypeLabel(uiLanguage, v)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400">{labels.date}</label>
        <input
          name="occurred_date"
          type="date"
          required
          defaultValue={defaultValues?.occurred_date ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400">{labels.timeOptional}</label>
        <input
          name="occurred_time"
          type="time"
          step={60}
          defaultValue={defaultValues?.occurred_time ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400">{labels.amount}</label>
        <input
          name="amount"
          type="text"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400">{labels.currency}</label>
        <input
          name="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>
    </>
  );
}
