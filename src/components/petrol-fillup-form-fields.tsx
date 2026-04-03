"use client";

import { useMemo, useState } from "react";

function formatCostPerLitrePreview(amountPaid: string, litres: string): string | null {
  const a = Number(amountPaid.replace(",", ".").trim());
  const l = Number(litres.replace(",", ".").trim());
  if (!Number.isFinite(a) || !Number.isFinite(l) || l <= 0 || a < 0) return null;
  return (a / l).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const inputClass =
  "w-full min-h-[52px] rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-base text-slate-100 shadow-inner shadow-slate-950/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40";
const labelClass = "block text-sm font-medium text-slate-300";

type Props = {
  carId: string;
  /** Set when editing an existing fill-up */
  fillupId?: string;
  currency?: string;
  defaults: {
    amount_paid: string;
    litres: string;
    odometer_km: string;
  };
};

export function PetrolFillupFormFields({ carId, fillupId, currency = "ILS", defaults }: Props) {
  const [amount, setAmount] = useState(defaults.amount_paid);
  const [litres, setLitres] = useState(defaults.litres);

  const costPreview = useMemo(() => formatCostPerLitrePreview(amount, litres), [amount, litres]);

  return (
    <>
      <input type="hidden" name="car_id" value={carId} />
      {fillupId ? <input type="hidden" name="id" value={fillupId} /> : null}
      <input type="hidden" name="currency" value={currency} />
      <div className="space-y-2">
        <label className={labelClass} htmlFor="amount_paid">
          Amount paid
        </label>
        <input
          id="amount_paid"
          name="amount_paid"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          required
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
          autoComplete="transaction-amount"
        />
      </div>
      <div className="space-y-2">
        <label className={labelClass} htmlFor="litres">
          Litres
        </label>
        <input
          id="litres"
          name="litres"
          type="number"
          inputMode="decimal"
          step="0.001"
          min="0"
          required
          placeholder="0.000"
          value={litres}
          onChange={(e) => setLitres(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="rounded-xl border border-slate-600/80 bg-slate-800/50 px-4 py-3 text-sm">
        <span className="text-slate-400">Cost per litre (from amount ÷ litres)</span>
        <p className="mt-1 text-lg font-medium tabular-nums text-slate-100">
          {costPreview != null ? `${costPreview}` : "—"}
        </p>
      </div>
      <div className="space-y-2">
        <label className={labelClass} htmlFor="odometer_km">
          Odometer (km)
        </label>
        <input
          id="odometer_km"
          name="odometer_km"
          type="number"
          inputMode="numeric"
          min="0"
          required
          defaultValue={defaults.odometer_km}
          className={inputClass}
        />
      </div>
    </>
  );
}
