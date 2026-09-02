"use client";

import { useState } from "react";

type BillingInterval = "monthly" | "annual";

type Props = {
  defaultInterval?: BillingInterval;
  defaultMonthlyDay?: number | string | null;
  intervalLabel: string;
  monthlyDayLabel: string;
  monthlyOptionLabel: string;
  annualOptionLabel: string;
  monthlyDayPlaceholder?: string;
  className: string;
  intervalOptionsOrder?: "monthly-first" | "annual-first";
  showIntervalRequiredMark?: boolean;
};

export function SubscriptionBillingIntervalFields({
  defaultInterval = "monthly",
  defaultMonthlyDay = "",
  intervalLabel,
  monthlyDayLabel,
  monthlyOptionLabel,
  annualOptionLabel,
  monthlyDayPlaceholder,
  className,
  intervalOptionsOrder = "monthly-first",
  showIntervalRequiredMark = false,
}: Props) {
  const [interval, setInterval] = useState<BillingInterval>(defaultInterval);
  const monthlyRequired = interval === "monthly";
  const options =
    intervalOptionsOrder === "annual-first"
      ? [
          { value: "annual" as const, label: annualOptionLabel },
          { value: "monthly" as const, label: monthlyOptionLabel },
        ]
      : [
          { value: "monthly" as const, label: monthlyOptionLabel },
          { value: "annual" as const, label: annualOptionLabel },
        ];

  return (
    <>
      <div>
        <label htmlFor="billing_interval" className="mb-1 block text-xs font-medium text-slate-400">
          {intervalLabel}
          {showIntervalRequiredMark ? <span className="text-rose-400"> *</span> : null}
        </label>
        <select
          id="billing_interval"
          name="billing_interval"
          required
          value={interval}
          onChange={(e) => setInterval(e.target.value as BillingInterval)}
          className={className}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="monthly_day_of_month" className="mb-1 block text-xs font-medium text-slate-400">
          {monthlyDayLabel}
          {monthlyRequired ? <span className="text-rose-400"> *</span> : null}
        </label>
        <input
          id="monthly_day_of_month"
          name="monthly_day_of_month"
          type="number"
          min={1}
          max={31}
          required={monthlyRequired}
          aria-required={monthlyRequired}
          defaultValue={defaultMonthlyDay ?? ""}
          className={className}
          placeholder={monthlyDayPlaceholder}
        />
      </div>
    </>
  );
}
