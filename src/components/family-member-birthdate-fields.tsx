"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gregorianDateToHebrewComponents, HEBREW_MONTH_OPTIONS } from "@/lib/hebrew-calendar";

const fieldClass =
  "rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100";

type Props = {
  isHebrew: boolean;
  /** True when Hebrew DOB day+month are already stored in the database. */
  hebrewPersistedInDb?: boolean;
  /** Wording for the save instruction in the auto-calculate prompt. */
  formKind?: "create" | "edit";
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
  hebrewPersistedInDb = false,
  formKind = "edit",
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
      ? { day: defaultHebrewDay, month: defaultHebrewMonth, year: defaultHebrewYear ?? 0 }
      : defaultGregorian
        ? hebrewFromGregorianInput(defaultGregorian)
        : null;

  const [hebrewPreview, setHebrewPreview] = useState(initialHebrew);
  const [autoCalculatedPendingSave, setAutoCalculatedPendingSave] = useState(
    () =>
      !hebrewPersistedInDb &&
      Boolean(defaultGregorian) &&
      (defaultHebrewDay == null || defaultHebrewMonth == null) &&
      initialHebrew != null,
  );

  const applyHebrew = useCallback(
    (h: { day: number; month: number; year: number } | null, force = false) => {
      if (!h) return;
      if (hebrewTouchedRef.current && !force) return;
      if (dayRef.current) dayRef.current.value = String(h.day);
      if (monthRef.current) monthRef.current.value = String(h.month);
      if (yearRef.current) yearRef.current.value = String(h.year);
      setHebrewPreview(h);
      if (!hebrewPersistedInDb) {
        setAutoCalculatedPendingSave(true);
      }
    },
    [hebrewPersistedInDb],
  );

  const onGregorianChange = (iso: string) => {
    const h = hebrewFromGregorianInput(iso);
    if (!iso) {
      setAutoCalculatedPendingSave(false);
      setHebrewPreview(null);
      return;
    }
    applyHebrew(h, !hebrewTouchedRef.current);
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
        <div className="flex w-fit flex-wrap items-end gap-2">
          <span className="pb-2 text-xs text-slate-500">{isHebrew ? "עברי" : "Hebrew"}</span>
          <div className="shrink-0">
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
          <div className="shrink-0">
            <label htmlFor="hebrew_date_of_birth_month" className="sr-only">
              {isHebrew ? "חודש" : "Month"}
            </label>
            <select
              ref={monthRef}
              id="hebrew_date_of_birth_month"
              name="hebrew_date_of_birth_month"
              defaultValue={initialHebrew?.month ?? ""}
              onChange={markHebrewTouched}
              className={`${fieldClass} w-[9.5rem]`}
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
          <div className="shrink-0">
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
      {formKind === "edit" && autoCalculatedPendingSave && hebrewPreview && (
        <div
          role="alert"
          className="rounded-lg border border-amber-600/80 bg-amber-950/50 px-3 py-2.5 text-sm text-amber-100"
        >
          <p className="font-medium">
            {isHebrew
              ? "תאריך הלידה העברי חושב אוטומטית ועדיין לא נשמר"
              : "Hebrew birth date was auto-calculated and is not saved yet"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/90">
            {isHebrew
              ? "בדקו שהיום, החודש והשנה נכונים. לאחר מכן לחצו «שמירת שינויים» בתחתית הטופס כדי לשמור."
              : "Please check that the day, month, and year are correct, then click Save changes at the bottom of the form."}
          </p>
        </div>
      )}
      {hebrewPreview && hebrewPersistedInDb && (
        <p className="text-xs text-slate-500">
          {isHebrew
            ? "שינוי בתאריך הלועזי מעדכן את התאריך העברי; ניתן לערוך ידנית."
            : "Changing the Gregorian date updates the Hebrew date; you can edit it manually."}
        </p>
      )}
    </div>
  );
}
