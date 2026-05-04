"use client";

import { useMemo, useState } from "react";

export type MonthPayableJobOption = { id: string; label: string };
export type MonthPayableProgramOption = { id: string; name: string; jobId: string };
export type MonthPayableConsultationTypeOption = { id: string; name: string };
export type MonthPayableClientOption = { id: string; label: string };

type Props = {
  jobs: MonthPayableJobOption[];
  programs: MonthPayableProgramOption[];
  consultationTypes: MonthPayableConsultationTypeOption[];
  clients: MonthPayableClientOption[];
  labels: {
    title: string;
    description: string;
    job: string;
    month: string;
    year: string;
    download: string;
    noJobs: string;
    includeLines: string;
    treatments: string;
    consultations: string;
    travel: string;
    program: string;
    consultationType: string;
    client: string;
    clearFilters: string;
    multiSelectHint: string;
    programFilterNote: string;
    clientFilterTravelNote: string;
  };
};

function defaultPreviousYearMonth(): { year: number; month: number } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const m = i + 1;
  return { value: m, label: String(m).padStart(2, "0") };
});

function buildDownloadHref(
  jobId: string,
  year: number,
  month: number,
  includeTreatments: boolean,
  includeConsultations: boolean,
  includeTravel: boolean,
  programIds: string[],
  consultationTypeIds: string[],
  clientIds: string[],
): string | null {
  if (!jobId || year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  if (!includeTreatments && !includeConsultations && !includeTravel) return null;
  const p = new URLSearchParams();
  p.set("jobId", jobId);
  p.set("year", String(year));
  p.set("month", String(month));
  p.set("includeTreatments", includeTreatments ? "1" : "0");
  p.set("includeConsultations", includeConsultations ? "1" : "0");
  p.set("includeTravel", includeTravel ? "1" : "0");
  for (const id of programIds) p.append("programId", id);
  for (const id of consultationTypeIds) p.append("consultationTypeId", id);
  for (const id of clientIds) p.append("clientId", id);
  return `/api/private-clinic/reports/month-payable?${p.toString()}`;
}

export function MonthPayableReportClient({ jobs, programs, consultationTypes, clients, labels }: Props) {
  const initial = useMemo(() => defaultPreviousYearMonth(), []);
  const [jobId, setJobId] = useState(() => jobs[0]?.id ?? "");
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [includeTreatments, setIncludeTreatments] = useState(true);
  const [includeConsultations, setIncludeConsultations] = useState(true);
  const [includeTravel, setIncludeTravel] = useState(true);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [selectedConsultationTypeIds, setSelectedConsultationTypeIds] = useState<string[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const programsForJob = useMemo(
    () => programs.filter((pr) => pr.jobId === jobId).sort((a, b) => a.name.localeCompare(b.name)),
    [programs, jobId],
  );

  const downloadHref = useMemo(
    () =>
      buildDownloadHref(
        jobId,
        year,
        month,
        includeTreatments,
        includeConsultations,
        includeTravel,
        selectedProgramIds,
        selectedConsultationTypeIds,
        selectedClientIds,
      ),
    [
      jobId,
      year,
      month,
      includeTreatments,
      includeConsultations,
      includeTravel,
      selectedProgramIds,
      selectedConsultationTypeIds,
      selectedClientIds,
    ],
  );

  const clearFilters = () => {
    setIncludeTreatments(true);
    setIncludeConsultations(true);
    setIncludeTravel(true);
    setSelectedProgramIds([]);
    setSelectedConsultationTypeIds([]);
    setSelectedClientIds([]);
  };

  if (jobs.length === 0) {
    return (
      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
        <h3 className="font-medium text-slate-100">{labels.title}</h3>
        <p className="text-sm text-slate-500">{labels.noJobs}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-4">
      <div>
        <h3 className="font-medium text-slate-100">{labels.title}</h3>
        <p className="text-sm text-slate-400">{labels.description}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
          <span className="text-slate-400">{labels.job}</span>
          <select
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setSelectedProgramIds([]);
            }}
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[5.5rem] flex-col gap-1 text-sm">
          <span className="text-slate-400">{labels.month}</span>
          <select
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[7rem] flex-col gap-1 text-sm">
          <span className="text-slate-400">{labels.year}</span>
          <input
            type="number"
            min={2000}
            max={2100}
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>

        <a
          href={downloadHref ?? undefined}
          className={
            downloadHref
              ? "inline-flex shrink-0 items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              : "inline-flex shrink-0 cursor-not-allowed items-center justify-center rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-slate-400"
          }
          aria-disabled={!downloadHref}
          onClick={(ev) => {
            if (!downloadHref) ev.preventDefault();
          }}
        >
          {labels.download}
        </a>
      </div>

      <div className="border-t border-slate-700 pt-4 space-y-4">
        <p className="text-xs text-slate-500">{labels.multiSelectHint}</p>

        <fieldset className="space-y-2">
          <legend className="text-sm text-slate-400 mb-2">{labels.includeLines}</legend>
          <div className="flex flex-wrap gap-4 text-sm text-slate-200">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTreatments}
                onChange={(e) => setIncludeTreatments(e.target.checked)}
                className="rounded border-slate-600"
              />
              {labels.treatments}
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeConsultations}
                onChange={(e) => setIncludeConsultations(e.target.checked)}
                className="rounded border-slate-600"
              />
              {labels.consultations}
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTravel}
                onChange={(e) => setIncludeTravel(e.target.checked)}
                className="rounded border-slate-600"
              />
              {labels.travel}
            </label>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm min-w-0">
            <span className="text-slate-400">{labels.program}</span>
            <select
              multiple
              size={Math.min(10, Math.max(4, programsForJob.length || 1))}
              className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-slate-100 min-h-[6rem]"
              value={selectedProgramIds}
              onChange={(e) =>
                setSelectedProgramIds([...e.target.selectedOptions].map((o) => o.value))
              }
            >
              {programsForJob.length === 0 ? (
                <option value="" disabled>
                  —
                </option>
              ) : (
                programsForJob.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))
              )}
            </select>
            <span className="text-xs text-slate-500">{labels.programFilterNote}</span>
          </label>

          <label className="flex flex-col gap-1 text-sm min-w-0">
            <span className="text-slate-400">{labels.consultationType}</span>
            <select
              multiple
              size={Math.min(10, Math.max(4, consultationTypes.length || 1))}
              className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-slate-100 min-h-[6rem]"
              value={selectedConsultationTypeIds}
              onChange={(e) =>
                setSelectedConsultationTypeIds([...e.target.selectedOptions].map((o) => o.value))
              }
            >
              {consultationTypes.length === 0 ? (
                <option value="" disabled>
                  —
                </option>
              ) : (
                consultationTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm min-w-0 sm:col-span-2 lg:col-span-1">
            <span className="text-slate-400">{labels.client}</span>
            <select
              multiple
              size={Math.min(10, Math.max(4, clients.length || 1))}
              className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-slate-100 min-h-[6rem]"
              value={selectedClientIds}
              onChange={(e) =>
                setSelectedClientIds([...e.target.selectedOptions].map((o) => o.value))
              }
            >
              {clients.length === 0 ? (
                <option value="" disabled>
                  —
                </option>
              ) : (
                clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))
              )}
            </select>
            <span className="text-xs text-slate-500">{labels.clientFilterTravelNote}</span>
          </label>
        </div>

        <button
          type="button"
          onClick={clearFilters}
          className="text-sm text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline"
        >
          {labels.clearFilters}
        </button>
      </div>
    </section>
  );
}
