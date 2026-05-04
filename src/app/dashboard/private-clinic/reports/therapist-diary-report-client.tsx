"use client";

import { useMemo, useState } from "react";

type Props = {
  labels: {
    title: string;
    description: string;
    yearFrom: string;
    yearTo: string;
    download: string;
  };
};

function defaultYear(): number {
  return new Date().getFullYear();
}

export function TherapistDiaryReportClient({ labels }: Props) {
  const initialYear = useMemo(() => defaultYear(), []);
  const [fromYear, setFromYear] = useState(initialYear);
  const [toYear, setToYear] = useState(initialYear);

  const downloadHref =
    fromYear >= 2000 &&
    fromYear <= 2100 &&
    toYear >= 2000 &&
    toYear <= 2100
      ? `/api/private-clinic/reports/therapist-diary?fromYear=${fromYear}&toYear=${toYear}`
      : null;

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-4">
      <div>
        <h3 className="font-medium text-slate-100">{labels.title}</h3>
        <p className="text-sm text-slate-400">{labels.description}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[7rem] flex-col gap-1 text-sm">
          <span className="text-slate-400">{labels.yearFrom}</span>
          <input
            type="number"
            min={2000}
            max={2100}
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
            value={fromYear}
            onChange={(e) => setFromYear(Number(e.target.value))}
          />
        </label>

        <label className="flex min-w-[7rem] flex-col gap-1 text-sm">
          <span className="text-slate-400">{labels.yearTo}</span>
          <input
            type="number"
            min={2000}
            max={2100}
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
            value={toYear}
            onChange={(e) => setToYear(Number(e.target.value))}
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
