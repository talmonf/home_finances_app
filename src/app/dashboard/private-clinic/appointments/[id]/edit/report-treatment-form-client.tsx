"use client";

import { useMemo, useState } from "react";
import { HouseholdDateIsoControl } from "@/components/household-date-field";
import { TreatmentTravelSessionFields } from "../../../treatments/treatment-travel-session-fields";

type ClientOption = { id: string; label: string };

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  appointmentId: string;
  clients: ClientOption[];
  showScheduleNext: boolean;
  defaultNextDate: string;
  defaultNextHour: string;
  defaultNextMinute: string;
  defaultDurationMinutes: string;
  labels: {
    amount: string;
    currency: string;
    note1: string;
    client: string;
    additionalClients: string;
    addAdditionalClient: string;
    remove: string;
    submit: string;
    scheduleNextAppointment: string;
    scheduleNextAppointmentHint: string;
    startDate: string;
    startTime: string;
    durationMinutes: string;
    travel: {
      section: string;
      checkbox: string;
      amount: string;
      kmOptional: string;
      currencyHint: string;
    };
  };
};

export function ReportTreatmentFormClient({
  action,
  appointmentId,
  clients,
  showScheduleNext,
  defaultNextDate,
  defaultNextHour,
  defaultNextMinute,
  defaultDurationMinutes,
  labels,
}: Props) {
  const [additionalParticipantIds, setAdditionalParticipantIds] = useState<string[]>([]);
  const [scheduleNext, setScheduleNext] = useState(showScheduleNext);
  const [nextDate, setNextDate] = useState(defaultNextDate);
  const [nextHour, setNextHour] = useState(defaultNextHour);
  const [nextMinute, setNextMinute] = useState(defaultNextMinute);
  const [durationMinutes, setDurationMinutes] = useState(defaultDurationMinutes);

  const selectedAdditionalIds = useMemo(
    () => new Set(additionalParticipantIds.filter(Boolean)),
    [additionalParticipantIds],
  );

  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")),
    [],
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0")),
    [],
  );
  const nextStartAt = useMemo(() => {
    if (!nextDate || !nextHour || !nextMinute) return "";
    return `${nextDate}T${nextHour}:${nextMinute}`;
  }, [nextDate, nextHour, nextMinute]);

  return (
    <form action={action} className="mt-3 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <input
        name="amount"
        placeholder={labels.amount}
        required
        className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
      />
      <input
        name="currency"
        defaultValue="ILS"
        placeholder={labels.currency}
        className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
      />
      <textarea
        name="note_1"
        placeholder={labels.note1}
        className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 md:col-span-2"
      />
      <div className="space-y-2 md:col-span-2">
        {additionalParticipantIds.length > 0 ? (
          <span className="block text-sm text-slate-300">{labels.additionalClients}</span>
        ) : null}
        {additionalParticipantIds.map((clientId, index) => (
          <div key={`participant-${index}`} className="flex items-center gap-2">
            <select
              name="additional_participant_ids"
              value={clientId}
              onChange={(e) => {
                const next = [...additionalParticipantIds];
                next[index] = e.target.value;
                setAdditionalParticipantIds(next);
              }}
              className="flex-1 rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">{labels.client}</option>
              {clients.map((cl) => (
                <option
                  key={cl.id}
                  value={cl.id}
                  disabled={selectedAdditionalIds.has(cl.id) && cl.id !== clientId}
                >
                  {cl.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                setAdditionalParticipantIds((prev) =>
                  prev.filter((_, rowIndex) => rowIndex !== index),
                )
              }
              className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
            >
              {labels.remove}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setAdditionalParticipantIds((prev) => [...prev, ""])}
          className="text-sm text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline"
        >
          {labels.addAdditionalClient}
        </button>
      </div>
      <TreatmentTravelSessionFields labels={labels.travel} />

      {showScheduleNext ? (
        <div className="space-y-3 rounded-lg border border-slate-600 bg-slate-800/40 p-3 md:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              name="schedule_next"
              value="1"
              checked={scheduleNext}
              onChange={(e) => setScheduleNext(e.target.checked)}
              className="rounded border-slate-600"
            />
            {labels.scheduleNextAppointment}
          </label>
          <p className="text-xs text-slate-400">{labels.scheduleNextAppointmentHint}</p>
          {scheduleNext ? (
            <>
              <input type="hidden" name="next_start_at" value={nextStartAt} />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <span className="block text-xs text-slate-300">{labels.startDate}</span>
                  <HouseholdDateIsoControl
                    valueIso={nextDate}
                    onIsoChange={setNextDate}
                    required={scheduleNext}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    aria-label={labels.startDate}
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-xs text-slate-300">{labels.startTime}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      required={scheduleNext}
                      value={nextHour}
                      onChange={(e) => setNextHour(e.target.value)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                    >
                      <option value="">--</option>
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <select
                      required={scheduleNext}
                      value={nextMinute}
                      onChange={(e) => setNextMinute(e.target.value)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                    >
                      <option value="">--</option>
                      {minuteOptions.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="space-y-1">
                  <span className="block text-xs text-slate-300">{labels.durationMinutes}</span>
                  <input
                    name="next_duration_minutes"
                    type="number"
                    min={1}
                    max={999}
                    required={scheduleNext}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full max-w-32 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        className="w-fit rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
      >
        {labels.submit}
      </button>
    </form>
  );
}
