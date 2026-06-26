"use client";

import { useMemo, useState } from "react";

type PropertyUtilityDefault = {
  id: string;
  utility_type: string;
  provider_name: string;
  account_number: string | null;
  meter_number: string | null;
  notes: string | null;
};

type RentalUtilityAddRowProps = {
  formId: string;
  utilityTypeLabels: Record<string, string>;
  propertyUtilities: PropertyUtilityDefault[];
};

type AddUtilityFields = {
  propertyUtilityId: string;
  utilityType: string;
  utilityCompany: string;
  accountNumber: string;
  meterNumber: string;
  lastMeterReading: string;
  notes: string;
};

function fieldsFromPropertyUtility(utility: PropertyUtilityDefault | undefined): AddUtilityFields {
  return {
    propertyUtilityId: utility?.id ?? "",
    utilityType: utility?.utility_type ?? "",
    utilityCompany: utility?.provider_name ?? "",
    accountNumber: utility?.account_number ?? "",
    meterNumber: utility?.meter_number ?? "",
    lastMeterReading: "",
    notes: utility?.notes ?? "",
  };
}

export function RentalUtilityAddRow({
  formId,
  utilityTypeLabels,
  propertyUtilities,
}: RentalUtilityAddRowProps) {
  const utilityDefaultsByType = useMemo(() => {
    const defaults = new Map<string, PropertyUtilityDefault>();
    for (const utility of propertyUtilities) {
      if (!defaults.has(utility.utility_type)) defaults.set(utility.utility_type, utility);
    }
    return defaults;
  }, [propertyUtilities]);

  const [fields, setFields] = useState<AddUtilityFields>(() => fieldsFromPropertyUtility(propertyUtilities[0]));

  return (
    <tr>
      <td className="px-3 py-2">
        <input form={formId} type="hidden" name="property_utility_id" value={fields.propertyUtilityId} />
        <select
          form={formId}
          name="utility_type"
          required
          value={fields.utilityType}
          onChange={(event) => {
            const utilityType = event.target.value;
            const propertyDefault = utilityDefaultsByType.get(utilityType);
            setFields(
              propertyDefault
                ? fieldsFromPropertyUtility(propertyDefault)
                : { ...fields, propertyUtilityId: "", utilityType },
            );
          }}
          aria-label="New utility type"
          className="w-36 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        >
          <option value="">Select type</option>
          {Object.entries(utilityTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          form={formId}
          name="utility_company"
          required
          value={fields.utilityCompany}
          onChange={(event) => setFields((current) => ({ ...current, utilityCompany: event.target.value }))}
          placeholder="Company"
          aria-label="New utility company"
          className="w-40 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        />
      </td>
      <td className="px-3 py-2">
        <input
          form={formId}
          name="account_number"
          value={fields.accountNumber}
          onChange={(event) => setFields((current) => ({ ...current, accountNumber: event.target.value }))}
          placeholder="Optional"
          aria-label="New account number"
          className="w-32 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        />
      </td>
      <td className="px-3 py-2">
        <input
          form={formId}
          name="meter_number"
          value={fields.meterNumber}
          onChange={(event) => setFields((current) => ({ ...current, meterNumber: event.target.value }))}
          placeholder="Optional"
          aria-label="New meter number"
          className="w-32 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        />
      </td>
      <td className="px-3 py-2">
        <input
          form={formId}
          name="last_meter_reading"
          value={fields.lastMeterReading}
          onChange={(event) => setFields((current) => ({ ...current, lastMeterReading: event.target.value }))}
          placeholder="Optional"
          aria-label="New last meter reading"
          className="w-36 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        />
      </td>
      <td className="px-3 py-2">
        <input
          form={formId}
          name="notes"
          value={fields.notes}
          onChange={(event) => setFields((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Optional"
          aria-label="New utility notes"
          className="w-40 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        />
      </td>
      <td className="px-3 py-2">
        <button
          type="submit"
          form={formId}
          className="rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-500"
        >
          Add utility
        </button>
      </td>
    </tr>
  );
}
