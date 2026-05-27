"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gregorianDateToHebrewComponents, HEBREW_MONTH_OPTIONS } from "@/lib/hebrew-calendar";

const fieldClass =
  "rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100";

type Props = {
  isHebrew: boolean;
  defaultGregorian?: string;
  defaultHebrewDay?: number | null;
  defaultHebrewMonth?: number | null;
  defaultHebrewYear?: number | null;
};

function hebrewFromGregorianInput(isoDate: string): {
  day: number;
  month: number;
  year: number;
} | null {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  const h = gregorianDateToHebrewComponents(d);
  if (h.year == null) return null;
  return { day: h.day, month: h.month, year: h.year };
}

export function FamilyMemberBirthdateFields({
  isHebrew,
  defaultGregorian = "",
  defaultHebrewDay,
  defaultHebrewMonth,
  defaultHebrewYear,
}: Props) {
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLSelectElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const hebrewTouchedRef = useRef(false);

  const initialHebrew =
    defaultHebrewDay != null && defaultHebrewMonth != null
      ? { day: defaultHebrewDay, month: defaultHebrewMonth, year: defaultHebrewYear ?? "" }
      : defaultGregorian
        ? hebrewFromGregorianInput(defaultGregorian)
        : null;

  const [hebrewPreview, setHebrewPreview] = useState(initialHebrew);

  const applyHebrew = useCallback(
    (h: { day: number; month: number; year: number } | null, force = false) => {
      if (!h) return;
      if (hebrewTouchedRef.current && !force) return;
      if (dayRef.current) dayRef.current.value = String(h.day);
      if (monthRef.current) monthRef.current.value = String(h.month);
      if (yearRef.current) yearRef.current.value = String(h.year);
      setHebrewPreview(h);
    },
    [],
  );

  useEffect(() => {
    if (defaultHebrewDay != null && defaultHebrewMonth != null) return;
    if (!defaultGregorian) return;
    applyHebrew(hebrewFromGregorianInput(defaultGregorian), true);
  }, [defaultGregorian, defaultHebrewDay, defaultHebrewMonth, applyHebrew]);

  const onGregorianChange = (iso: string) => {
    applyHebrew(hebrewFromGregorianInput(iso), !hebrewTouchedRef.current);
  };

  const markHebrewTouched = () => {
    hebrewTouchedRef.current = true;
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-400">
        {isHebrew ? "תאריכי לידה" : "Birth dates"}
      </p>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="min-w-[10.5rem] flex-1 sm:flex-none sm:max-w-[11rem]">
          <label htmlFor="date_of_birth" className="mb-1 block text-xs text-slate-500">
            {isHebrew ? "לועזי" : "Gregorian"}
          </label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            defaultValue={defaultGregorian}
            onChange={(e) => onGregorianChange(e.target.value)}
            className={`${fieldClass} w-full`}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2 sm:max-w-md">
          <span className="pb-2 text-xs text-slate-500">{isHebrew ? "עברי" : "Hebrew"}</span>
          <div>
            <label htmlFor="hebrew_date_of_birth_day" className="sr-only">
              {isHebrew ? "יום" : "Day"}
            </label>
            <input
              ref={dayRef}
              id="hebrew_date_of_birth_day"
              name="hebrew_date_of_birth_day"
              type="number"
              min={1}
              max={30}
              defaultValue={initialHebrew?.day ?? ""}
              onChange={markHebrewTouched}
              className={`${fieldClass} w-14`}
              aria-label={isHebrew ? "יום לידה עברי" : "Hebrew birthday day"}
            />
          </div>
          <div className="min-w-[7rem] flex-1">
            <label htmlFor="hebrew_date_of_birth_month" className="sr-only">
              {isHebrew ? "חודש" : "Month"}
            </label>
            <select
              ref={monthRef}
              id="hebrew_date_of_birth_month"
              name="hebrew_date_of_birth_month"
              defaultValue={initialHebrew?.month ?? ""}
              onChange={markHebrewTouched}
              className={`${fieldClass} w-full min-w-[7rem] max-w-[10rem]`}
              aria-label={isHebrew ? "חודש לידה עברי" : "Hebrew birthday month"}
            >
              <option value="">—</option>
              {HEBREW_MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {isHebrew ? m.labelHe : m.labelEn}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="hebrew_date_of_birth_year" className="sr-only">
              {isHebrew ? "שנה" : "Year"}
            </label>
            <input
              ref={yearRef}
              id="hebrew_date_of_birth_year"
              name="hebrew_date_of_birth_year"
              type="number"
              min={1}
              defaultValue={initialHebrew?.year ?? ""}
              onChange={markHebrewTouched}
              className={`${fieldClass} w-[4.5rem]`}
              aria-label={isHebrew ? "שנת לידה עברי" : "Hebrew birth year"}
            />
          </div>
        </div>
      </div>
      {hebrewPreview && (
        <p className="text-xs text-slate-500">
          {isHebrew
            ? "מתעדכן אוטומטית מתאריך לועזי; ניתן לערוך ידנית."
            : "Filled from the Gregorian date; you can edit manually."}
        </p>
      )}
    </div>
  );
}
