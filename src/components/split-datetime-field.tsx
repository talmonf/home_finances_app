"use client";

import { useMemo, useState } from "react";

type Props = {
  name: string;
  initialValue?: string;
  required?: boolean;
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
  uiLanguage = "en",
  dateAriaLabel,
  hourAriaLabel,
  minuteAriaLabel,
  wrapperClassName = "grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem]",
  dateInputClassName = "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100",
  timeWrapperClassName = "grid grid-cols-2 gap-2",
  selectClassName = "w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100",
}: Props) {
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
  const value = useMemo(() => {
    if (!date || !hour || !minute) return "";
    return `${date}T${hour}:${minute}`;
  }, [date, hour, minute]);

  return (
    <div className={wrapperClassName}>
      <input type="hidden" name={name} value={value} />
      <input
        type="date"
        value={date}
        required={required}
        onChange={(e) => setDate(e.target.value)}
        className={dateInputClassName}
        aria-label={dateAriaLabel ?? defaultDateAriaLabel}
      />
      <div className={timeWrapperClassName}>
        <select
          value={hour}
          required={required}
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
          required={required}
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
