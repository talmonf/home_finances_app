"use client";

import { useMemo, useState } from "react";
import { useObfuscateSensitive } from "@/components/household-preferences-context";
import { OBFUSCATED } from "@/lib/privacy-display";

type PropertyUtilityDefault = {
  id: string;
  utility_type: string;
  provider_name: string;
  client_number: string | null;
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
  clientNumber: string;
  accountNumber: string;
  meterNumber: string;
  lastMeterReading: string;
  notes: string;
};

const EMPTY_FIELDS: AddUtilityFields = {
  propertyUtilityId: "",
  utilityType: "",
  utilityCompany: "",
  clientNumber: "",
  accountNumber: "",
  meterNumber: "",
  lastMeterReading: "",
  notes: "",
};

function fieldsFromPropertyUtility(utility: PropertyUtilityDefault | undefined): AddUtilityFields {
  return {
    propertyUtilityId: utility?.id ?? "",
    utilityType: utility?.utility_type ?? "",
    utilityCompany: utility?.provider_name ?? "",
    clientNumber: utility?.client_number ?? "",
    accountNumber: utility?.account_number ?? "",
    meterNumber: utility?.meter_number ?? "",
    lastMeterReading: "",
    notes: utility?.notes ?? "",
  };
}

function PrefillAwareInput({
  obfuscate,
  formId,
  name,
  value,
  onChange,
  className,
  placeholder,
  ariaLabel,
  required,
}: {
  obfuscate: boolean;
  formId: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  placeholder: string;
  ariaLabel: string;
  required?: boolean;
}) {
  if (obfuscate && value.trim() !== "") {
    return (
      <>
        <input type="hidden" form={formId} name={name} value={value} />
        <input
          form={formId}
          value={OBFUSCATED}
          readOnly
          required={required}
          aria-label={ariaLabel}
          className={className}
        />
      </>
    );
  }
  return (
    <input
      form={formId}
      name={name}
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className}
    />
  );
}

export function RentalUtilityAddRow({
  formId,
  utilityTypeLabels,
  propertyUtilities,
}: RentalUtilityAddRowProps) {
  const obfuscate = useObfuscateSensitive();
  const utilityDefaultsByType = useMemo(() => {
    const defaults = new Map<string, PropertyUtilityDefault>();
    for (const utility of propertyUtilities) {
      if (!defaults.has(utility.utility_type)) defaults.set(utility.utility_type, utility);
    }
    return defaults;
  }, [propertyUtilities]);

  const [fields, setFields] = useState<AddUtilityFields>(EMPTY_FIELDS);

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
                : { ...EMPTY_FIELDS, utilityType },
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
        <PrefillAwareInput
          obfuscate={obfuscate}
          formId={formId}
          name="utility_company"
          required
          value={fields.utilityCompany}
          onChange={(utilityCompany) => setFields((current) => ({ ...current, utilityCompany }))}
          placeholder="Company"
          ariaLabel="New utility company"
          className="w-40 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        />
      </td>
      <td className="px-3 py-2">
        <PrefillAwareInput
          obfuscate={obfuscate}
          formId={formId}
          name="client_number"
          value={fields.clientNumber}
          onChange={(clientNumber) => setFields((current) => ({ ...current, clientNumber }))}
          placeholder="Optional"
          ariaLabel="New client number"
          className="w-32 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        />
      </td>
      <td className="px-3 py-2">
        <PrefillAwareInput
          obfuscate={obfuscate}
          formId={formId}
          name="account_number"
          value={fields.accountNumber}
          onChange={(accountNumber) => setFields((current) => ({ ...current, accountNumber }))}
          placeholder="Optional"
          ariaLabel="New account number"
          className="w-32 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        />
      </td>
      <td className="px-3 py-2">
        <PrefillAwareInput
          obfuscate={obfuscate}
          formId={formId}
          name="meter_number"
          value={fields.meterNumber}
          onChange={(meterNumber) => setFields((current) => ({ ...current, meterNumber }))}
          placeholder="Optional"
          ariaLabel="New meter number"
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
        <PrefillAwareInput
          obfuscate={obfuscate}
          formId={formId}
          name="notes"
          value={fields.notes}
          onChange={(notes) => setFields((current) => ({ ...current, notes }))}
          placeholder="Optional"
          ariaLabel="New utility notes"
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
