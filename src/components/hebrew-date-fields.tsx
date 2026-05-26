import { HEBREW_MONTH_OPTIONS } from "@/lib/hebrew-calendar";

type HebrewDateFieldsProps = {
  prefix: string;
  isHebrew: boolean;
  defaultDay?: number | null;
  defaultMonth?: number | null;
  defaultYear?: number | null;
  dayLabel?: string;
  monthLabel?: string;
  yearLabel?: string;
};

export function HebrewDateFields({
  prefix,
  isHebrew,
  defaultDay,
  defaultMonth,
  defaultYear,
  dayLabel,
  monthLabel,
  yearLabel,
}: HebrewDateFieldsProps) {
  const dayName = `${prefix}_hebrew_day`;
  const monthName = `${prefix}_hebrew_month`;
  const yearName = `${prefix}_hebrew_year`;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <label htmlFor={dayName} className="mb-1 block text-xs font-medium text-slate-400">
          {dayLabel ?? (isHebrew ? "יום (עברי)" : "Day (Hebrew)")}
        </label>
        <input
          id={dayName}
          name={dayName}
          type="number"
          min={1}
          max={30}
          defaultValue={defaultDay ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          placeholder={isHebrew ? "אופציונלי" : "Optional"}
        />
      </div>
      <div>
        <label htmlFor={monthName} className="mb-1 block text-xs font-medium text-slate-400">
          {monthLabel ?? (isHebrew ? "חודש (עברי)" : "Month (Hebrew)")}
        </label>
        <select
          id={monthName}
          name={monthName}
          defaultValue={defaultMonth ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
        <label htmlFor={yearName} className="mb-1 block text-xs font-medium text-slate-400">
          {yearLabel ?? (isHebrew ? "שנה (עברי)" : "Year (Hebrew)")}
        </label>
        <input
          id={yearName}
          name={yearName}
          type="number"
          min={1}
          defaultValue={defaultYear ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          placeholder={isHebrew ? "אופציונלי" : "Optional"}
        />
      </div>
    </div>
  );
}

/** Family member Hebrew DOB field names (no prefix). */
export function FamilyMemberHebrewDobFields({
  isHebrew,
  defaultDay,
  defaultMonth,
  defaultYear,
}: {
  isHebrew: boolean;
  defaultDay?: number | null;
  defaultMonth?: number | null;
  defaultYear?: number | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <label htmlFor="hebrew_date_of_birth_day" className="mb-1 block text-xs font-medium text-slate-400">
          {isHebrew ? "יום לידה (עברי)" : "Hebrew birthday day"}
        </label>
        <input
          id="hebrew_date_of_birth_day"
          name="hebrew_date_of_birth_day"
          type="number"
          min={1}
          max={30}
          defaultValue={defaultDay ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>
      <div>
        <label htmlFor="hebrew_date_of_birth_month" className="mb-1 block text-xs font-medium text-slate-400">
          {isHebrew ? "חודש לידה (עברי)" : "Hebrew birthday month"}
        </label>
        <select
          id="hebrew_date_of_birth_month"
          name="hebrew_date_of_birth_month"
          defaultValue={defaultMonth ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
        <label htmlFor="hebrew_date_of_birth_year" className="mb-1 block text-xs font-medium text-slate-400">
          {isHebrew ? "שנת לידה (עברי)" : "Hebrew birth year"}
        </label>
        <input
          id="hebrew_date_of_birth_year"
          name="hebrew_date_of_birth_year"
          type="number"
          min={1}
          defaultValue={defaultYear ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>
    </div>
  );
}
