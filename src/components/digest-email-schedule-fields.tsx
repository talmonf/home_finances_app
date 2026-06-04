"use client";

import { useState } from "react";

type Frequency = "daily" | "weekly" | "monthly";

type Props = {
  isHebrew: boolean;
  initialFrequency: Frequency;
  initialDayOfWeek: number;
  initialDayOfMonth: number;
};

export function DigestEmailScheduleFields({
  isHebrew,
  initialFrequency,
  initialDayOfWeek,
  initialDayOfMonth,
}: Props) {
  const [frequency, setFrequency] = useState<Frequency>(initialFrequency);

  return (
    <>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">
          {isHebrew ? "תדירות" : "Frequency"}
        </label>
        <select
          name="frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as Frequency)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="daily">{isHebrew ? "יומי" : "Daily"}</option>
          <option value="weekly">{isHebrew ? "שבועי" : "Weekly"}</option>
          <option value="monthly">{isHebrew ? "חודשי" : "Monthly"}</option>
        </select>
        <p className="text-xs text-slate-500">
          {frequency === "daily"
            ? isHebrew
              ? "נשלח בכל יום בשעה שבחרתם (לא יותר מפעם ביום)."
              : "Sent every day at your chosen hour (at most once per calendar day)."
            : frequency === "weekly"
              ? isHebrew
                ? "נשלח פעם בשבוע ביום ובשעה שבחרתם."
                : "Sent once a week on the day and hour you choose."
              : isHebrew
                ? "נשלח פעם בחודש ביום ובשעה שבחרתם."
                : "Sent once a month on the calendar day and hour you choose."}
        </p>
      </div>

      {frequency === "weekly" ? (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">
            {isHebrew ? "יום בשבוע" : "Day of week"}
          </label>
          <select
            name="day_of_week"
            defaultValue={String(initialDayOfWeek)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            {(isHebrew
              ? ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
              : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
            ).map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {frequency === "monthly" ? (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">
            {isHebrew ? "יום בחודש (1–31)" : "Day of month (1–31)"}
          </label>
          <input
            type="number"
            name="day_of_month"
            min={1}
            max={31}
            defaultValue={initialDayOfMonth}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <p className="text-xs text-slate-500">
            {isHebrew
              ? "אם לחודש אין מספיק ימים (למשל יום 31 בפברואר), השליחה תתוזמן ליום האחרון באותו חודש."
              : "If the month has fewer days than your pick (e.g. 31st in February), the send uses that month's last day."}
          </p>
        </div>
      ) : null}
    </>
  );
}
