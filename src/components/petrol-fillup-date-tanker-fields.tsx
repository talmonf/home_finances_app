"use client";

import { isEligiblePetrolTankerOnFillDate } from "@/lib/family-member-age";
import { useHouseholdDateFormat } from "@/components/household-preferences-context";
import { HOUSEHOLD_DATE_FORMAT_LABELS } from "@/lib/household-date-format";
import { formatFilledAtForForm, parseFilledAtFromForm } from "@/lib/petrol-fillup-filled-at";
import { useMemo, useState } from "react";

const inputClass =
  "w-full min-h-[52px] rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-base text-slate-100 shadow-inner shadow-slate-950/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40";
const labelClass = "block text-sm font-medium text-slate-300";

export type PetrolTankerMember = {
  id: string;
  full_name: string;
  date_of_birth: Date | string | null;
};

const defaultDateTankerLabels = {
  date: "Date",
  tankedUpBy: "Tanked up by",
  select: "Select…",
  tankerAgeHint:
    "Family members aged 16 or older on the fill date (requires date of birth). Change the date above to update who appears here.",
  tankerNoEligible:
    "No one is aged 16+ on this fill date. Pick a different date or add/update dates of birth for family members.",
  tankerNoDob:
    "Add a date of birth for each family member who should appear here. You need at least one person aged 16+ on the fill date to record who tanked up.",
};

type Props = {
  members: PetrolTankerMember[];
  /** Stored calendar day as `yyyy-mm-dd` (UTC). */
  defaultFilledAt: string;
  /** Stored tanker when editing (always shown in list if missing from age filter) */
  defaultTankerId?: string | null;
  labels?: Partial<typeof defaultDateTankerLabels>;
};

function asDate(d: Date | string | null): Date | null {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
}

export function PetrolFillupDateTankerFields({ members, defaultFilledAt, defaultTankerId, labels }: Props) {
  const L = { ...defaultDateTankerLabels, ...labels };
  const dateFormat = useHouseholdDateFormat();
  const formatHint = HOUSEHOLD_DATE_FORMAT_LABELS[dateFormat];

  const initialIso = defaultFilledAt.trim();
  const [filledAtIso, setFilledAtIso] = useState(initialIso);
  const [displayDate, setDisplayDate] = useState(() => formatFilledAtForForm(initialIso, dateFormat));
  const [dateError, setDateError] = useState<string | null>(null);
  const [tankerId, setTankerId] = useState(defaultTankerId ?? "");

  const filledAtDate = useMemo(
    () => (filledAtIso ? new Date(`${filledAtIso}T12:00:00.000Z`) : new Date("invalid")),
    [filledAtIso],
  );

  const eligibleTankers = useMemo(() => {
    if (!filledAtIso || Number.isNaN(filledAtDate.getTime())) {
      return [];
    }
    const base = members.filter((m) => {
      const dob = asDate(m.date_of_birth);
      return dob != null && isEligiblePetrolTankerOnFillDate(dob, filledAtDate);
    });
    let list = [...base];
    if (defaultTankerId && !list.some((m) => m.id === defaultTankerId)) {
      const extra = members.find((m) => m.id === defaultTankerId);
      if (extra) list = [...list, extra];
    }
    return list.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [members, filledAtDate, filledAtIso, defaultTankerId]);

  const safeTankerId = useMemo(() => {
    if (!tankerId) return "";
    return eligibleTankers.some((m) => m.id === tankerId) ? tankerId : "";
  }, [tankerId, eligibleTankers]);

  const anyDob = members.some((m) => m.date_of_birth != null);

  function applyDisplay(raw: string) {
    setDisplayDate(raw);
    const parsed = parseFilledAtFromForm(raw, dateFormat);
    if (parsed.ok) {
      setFilledAtIso(parsed.isoYmd);
      setDateError(null);
    } else {
      setFilledAtIso("");
    }
  }

  function onBlurDisplay() {
    const parsed = parseFilledAtFromForm(displayDate, dateFormat);
    if (parsed.ok) {
      setFilledAtIso(parsed.isoYmd);
      setDisplayDate(formatFilledAtForForm(parsed.isoYmd, dateFormat));
      setDateError(null);
    } else {
      setDateError(parsed.message);
      setFilledAtIso("");
    }
  }

  return (
    <div className="contents">
      <div className="space-y-2">
        <label className={labelClass} htmlFor="filled_at_display">
          {L.date}
        </label>
        <input type="hidden" name="filled_at" value={filledAtIso} required />
        <input
          id="filled_at_display"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={formatHint}
          value={displayDate}
          onChange={(e) => applyDisplay(e.target.value)}
          onBlur={onBlurDisplay}
          aria-invalid={dateError ? true : undefined}
          aria-describedby={dateError ? "filled_at_error" : "filled_at_hint"}
          className={`${inputClass} ${dateError ? "border-rose-500/80 ring-1 ring-rose-500/30" : ""}`}
        />
        {dateError ? (
          <p id="filled_at_error" className="text-xs text-rose-400">
            {dateError}
          </p>
        ) : (
          <p id="filled_at_hint" className="text-xs text-slate-500">
            {formatHint}
          </p>
        )}
      </div>
      {eligibleTankers.length > 0 ? (
        <div className="space-y-2">
          <label className={labelClass} htmlFor="tanked_up_by_family_member_id">
            {L.tankedUpBy}
          </label>
          <select
            id="tanked_up_by_family_member_id"
            name="tanked_up_by_family_member_id"
            value={safeTankerId}
            onChange={(e) => setTankerId(e.target.value)}
            className={inputClass}
          >
            <option value="">{L.select}</option>
            {eligibleTankers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">{L.tankerAgeHint}</p>
        </div>
      ) : filledAtIso && !Number.isNaN(filledAtDate.getTime()) ? (
        <p className="rounded-xl border border-slate-700/80 bg-slate-800/40 px-3 py-2 text-sm text-slate-500">
          {anyDob ? L.tankerNoEligible : L.tankerNoDob}
        </p>
      ) : null}
    </div>
  );
}
