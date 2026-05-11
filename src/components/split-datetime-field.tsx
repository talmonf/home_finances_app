"use client";

import { useMemo, useState } from "react";
import { useHouseholdDateFormat } from "@/components/household-preferences-context";
import { htmlLangForDateDisplayFormat } from "@/lib/household-date-format";

type Props = {
  name: string;
  initialValue?: string;
  /** When true, the calendar date is required (if `required` is true); hour/minute may be left unset. */
  required?: boolean;
  /**
   * When true, omitting time submits local midnight (`yyyy-mm-ddT00:00`) instead of an empty value.
   * Hour/minute are not HTML-required; `required` applies to the date input only.
   */
  timeOptional?: boolean;
  uiLanguage?: "en" | "he";
  dateAriaLabel?: string;
  hourAriaLabel?: string;
  minuteAriaLabel?: string;
  wrapperClassName?: string;
  dateInputClassName?: string;
  timeWrapperClassName?: string;
  selectClassName?: string;
};

export function SplitDateTimeField({
  name,
  initialValue = "",
  required = false,
  timeOptional = false,
  uiLanguage = "en",
  dateAriaLabel,
  hourAriaLabel,
  minuteAriaLabel,
  wrapperClassName = "grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem]",
  dateInputClassName =
    "w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500",
  timeWrapperClassName = "grid grid-cols-2 gap-2",
  selectClassName =
    "w-full rounded-lg border border-slate-500 bg-slate-800 px-2 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500",
}: Props) {
  const householdDateFormat = useHouseholdDateFormat();
  const dateInputLang = htmlLangForDateDisplayFormat(householdDateFormat);
  const defaultDateAriaLabel = uiLanguage === "he" ? "תאריך" : "Date";
  const defaultHourAriaLabel = uiLanguage === "he" ? "שעה" : "Hour";
  const defaultMinuteAriaLabel = uiLanguage === "he" ? "דקות" : "Minute";
  const [initialDate = "", initialTime = ""] = initialValue.slice(0, 16).split("T");
  const [initialHour = "", initialMinute = ""] = initialTime.split(":");
  const [date, setDate] = useState(initialDate);
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);

  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")),
    [],
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")),
    [],
  );
  const timeRequired = required && !timeOptional;
  const value = useMemo(() => {
    if (!date) return "";
    if (timeOptional) {
      if (hour && minute) return `${date}T${hour}:${minute}`;
      return `${date}T00:00`;
    }
    if (!hour || !minute) return "";
    return `${date}T${hour}:${minute}`;
  }, [date, hour, minute, timeOptional]);

  return (
    <div className={wrapperClassName}>
      <input type="hidden" name={name} value={value} />
      <span lang={dateInputLang} className="min-w-0 w-full">
        <input
          type="date"
          value={date}
          required={required}
          onChange={(e) => setDate(e.target.value)}
          className={dateInputClassName}
          aria-label={dateAriaLabel ?? defaultDateAriaLabel}
        />
      </span>
      <div className={timeWrapperClassName}>
        <select
          value={hour}
          required={timeRequired}
          onChange={(e) => setHour(e.target.value)}
          className={selectClassName}
          aria-label={hourAriaLabel ?? defaultHourAriaLabel}
        >
          <option value="">--</option>
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select
          value={minute}
          required={timeRequired}
          onChange={(e) => setMinute(e.target.value)}
          className={selectClassName}
          aria-label={minuteAriaLabel ?? defaultMinuteAriaLabel}
        >
          <option value="">--</option>
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
