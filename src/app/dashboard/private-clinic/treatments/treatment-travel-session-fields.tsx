"use client";

import { useState } from "react";

type Labels = {
  section: string;
  checkbox: string;
  amount: string;
  kmOptional: string;
  currencyHint: string;
};

type Initial = {
  treatment_travel_enabled?: boolean;
  treatment_travel_amount?: string;
  treatment_travel_km?: string;
};

export function TreatmentTravelSessionFields({ labels, initial }: { labels: Labels; initial?: Initial }) {
  const [enabled, setEnabled] = useState(Boolean(initial?.treatment_travel_enabled));

  return (
    <div className="md:col-span-2 space-y-3 rounded-lg border border-slate-600/90 bg-slate-800/70 p-3 ring-1 ring-slate-600/40">
      <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">{labels.section}</h4>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          name="treatment_travel_enabled"
          value="1"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-1 rounded border-slate-600"
        />
        <span>{labels.checkbox}</span>
      </label>
      {enabled ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs text-slate-400">{labels.amount}</label>
            <input
              name="treatment_travel_amount"
              defaultValue={initial?.treatment_travel_amount ?? ""}
              required
              inputMode="decimal"
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">{labels.kmOptional}</label>
            <input
              name="treatment_travel_km"
              defaultValue={initial?.treatment_travel_km ?? ""}
              inputMode="decimal"
              placeholder="e.g. 12"
              className="mt-1 w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <p className="md:col-span-2 text-xs text-slate-500">{labels.currencyHint}</p>
        </div>
      ) : null}
    </div>
  );
}
