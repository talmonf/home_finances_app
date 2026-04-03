"use client";

import { isEligiblePetrolTankerOnFillDate } from "@/lib/family-member-age";
import { useEffect, useMemo, useState } from "react";

const inputClass =
  "w-full min-h-[52px] rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-base text-slate-100 shadow-inner shadow-slate-950/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40";
const labelClass = "block text-sm font-medium text-slate-300";

export type PetrolTankerMember = {
  id: string;
  full_name: string;
  date_of_birth: Date | string | null;
};

type Props = {
  members: PetrolTankerMember[];
  defaultFilledAt: string;
  /** Stored tanker when editing (always shown in list if missing from age filter) */
  defaultTankerId?: string | null;
};

function asDate(d: Date | string | null): Date | null {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
}

export function PetrolFillupDateTankerFields({ members, defaultFilledAt, defaultTankerId }: Props) {
  const [filledAt, setFilledAt] = useState(defaultFilledAt);
  const [tankerId, setTankerId] = useState(defaultTankerId ?? "");

  useEffect(() => {
    setFilledAt(defaultFilledAt);
  }, [defaultFilledAt]);

  useEffect(() => {
    setTankerId(defaultTankerId ?? "");
  }, [defaultTankerId]);

  const filledAtDate = useMemo(() => new Date(`${filledAt}T12:00:00.000Z`), [filledAt]);

  const eligibleTankers = useMemo(() => {
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
  }, [members, filledAtDate, defaultTankerId]);

  useEffect(() => {
    setTankerId((prev) => {
      if (!prev) return prev;
      if (!eligibleTankers.some((m) => m.id === prev)) return "";
      return prev;
    });
  }, [eligibleTankers]);

  const anyDob = members.some((m) => m.date_of_birth != null);

  return (
    <>
      <div className="space-y-2">
        <label className={labelClass} htmlFor="filled_at">
          Date
        </label>
        <input
          id="filled_at"
          name="filled_at"
          type="date"
          required
          value={filledAt}
          onChange={(e) => setFilledAt(e.target.value)}
          className={inputClass}
        />
      </div>
      {eligibleTankers.length > 0 ? (
        <div className="space-y-2">
          <label className={labelClass} htmlFor="tanked_up_by_family_member_id">
            Tanked up by
          </label>
          <select
            id="tanked_up_by_family_member_id"
            name="tanked_up_by_family_member_id"
            required
            value={tankerId}
            onChange={(e) => setTankerId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select…</option>
            {eligibleTankers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Family members aged 16 or older on the fill date (requires date of birth). Change the date above to update
            who appears here.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-700/80 bg-slate-800/40 px-3 py-2 text-sm text-slate-500">
          {anyDob
            ? "No one is aged 16+ on this fill date. Pick a different date or add/update dates of birth for family members."
            : "Add a date of birth for each family member who should appear here. You need at least one person aged 16+ on the fill date to record who tanked up."}
        </p>
      )}
    </>
  );
}
