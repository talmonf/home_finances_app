"use client";

import { useState } from "react";
import { SensitiveTextInput } from "@/components/sensitive-fields";

export type SubscriptionBillingIntervalValue = "monthly" | "annual" | "usage";

type Props = {
  defaultInterval?: SubscriptionBillingIntervalValue;
  defaultMonthlyDay?: number | string | null;
  intervalLabel: string;
  monthlyDayLabel: string;
  monthlyOptionLabel: string;
  annualOptionLabel: string;
  usageOptionLabel: string;
  usageHint?: string;
  monthlyDayPlaceholder?: string;
  className: string;
  intervalOptionsOrder?: "monthly-first" | "annual-first";
  showIntervalRequiredMark?: boolean;
  feeLabel: string;
  feeOptionalLabel: string;
  feeDefaultValue?: string;
  feePlaceholder?: string;
  showFeeRequiredMark?: boolean;
  obfuscateFee?: boolean;
};

export function SubscriptionBillingIntervalFields({
  defaultInterval = "monthly",
  defaultMonthlyDay = "",
  intervalLabel,
  monthlyDayLabel,
  monthlyOptionLabel,
  annualOptionLabel,
  usageOptionLabel,
  usageHint,
  monthlyDayPlaceholder,
  className,
  intervalOptionsOrder = "monthly-first",
  showIntervalRequiredMark = false,
  feeLabel,
  feeOptionalLabel,
  feeDefaultValue = "",
  feePlaceholder,
  showFeeRequiredMark = false,
  obfuscateFee = false,
}: Props) {
  const [interval, setInterval] = useState<SubscriptionBillingIntervalValue>(defaultInterval);
  const monthlyRequired = interval === "monthly";
  const feeRequired = interval !== "usage";
  const cadenceOptions =
    intervalOptionsOrder === "annual-first"
      ? [
          { value: "annual" as const, label: annualOptionLabel },
          { value: "monthly" as const, label: monthlyOptionLabel },
        ]
      : [
          { value: "monthly" as const, label: monthlyOptionLabel },
          { value: "annual" as const, label: annualOptionLabel },
        ];
  const options = [...cadenceOptions, { value: "usage" as const, label: usageOptionLabel }];

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
          onChange={(e) => setInterval(e.target.value as SubscriptionBillingIntervalValue)}
          className={className}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {interval === "usage" && usageHint ? (
          <p className="mt-1 text-[11px] leading-snug text-slate-500">{usageHint}</p>
        ) : null}
      </div>
      {interval !== "usage" ? (
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
      ) : null}
      <div>
        <label htmlFor="fee_amount" className="mb-1 block text-xs font-medium text-slate-400">
          {feeRequired ? feeLabel : feeOptionalLabel}
          {feeRequired && showFeeRequiredMark ? <span className="text-rose-400"> *</span> : null}
        </label>
        <SensitiveTextInput
          obfuscate={obfuscateFee}
          id="fee_amount"
          name="fee_amount"
          type="number"
          step="0.01"
          min="0"
          required={feeRequired}
          value={feeDefaultValue}
          className={className}
          placeholder={feeRequired ? feePlaceholder : undefined}
        />
      </div>
    </>
  );
}
