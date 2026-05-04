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
    <div className="md:col-span-2 space-y-3 rounded-lg border border-slate-700/80 bg-slate-800/40 p-3">
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
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">{labels.kmOptional}</label>
            <input
              name="treatment_travel_km"
              defaultValue={initial?.treatment_travel_km ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <p className="md:col-span-2 text-xs text-slate-500">{labels.currencyHint}</p>
        </div>
      ) : null}
    </div>
  );
}
