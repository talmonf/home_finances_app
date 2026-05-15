"use client";

import { useMemo, useState } from "react";
import { defaultClinicJobId } from "@/lib/private-clinic/default-clinic-job-id";

export type MonthPayableJobOption = { id: string; label: string };

type Props = {
  jobs: MonthPayableJobOption[];
  labels: {
    title: string;
    description: string;
    job: string;
    month: string;
    year: string;
    download: string;
    noJobs: string;
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

export function MonthPayableReportClient({ jobs, labels }: Props) {
  const initial = useMemo(() => defaultPreviousYearMonth(), []);
  const [jobId, setJobId] = useState(() => defaultClinicJobId(jobs));
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);

  const downloadHref =
    jobId && year >= 2000 && year <= 2100 && month >= 1 && month <= 12
      ? `/api/private-clinic/reports/month-payable?jobId=${encodeURIComponent(jobId)}&year=${year}&month=${month}`
      : null;

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
            onChange={(e) => setJobId(e.target.value)}
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
    </section>
  );
}
