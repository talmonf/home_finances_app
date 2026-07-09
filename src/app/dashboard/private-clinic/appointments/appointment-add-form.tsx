"use client";

import { useMemo, useState } from "react";
import { HouseholdDateIsoControl } from "@/components/household-date-field";
import { useHouseholdDateFormat } from "@/components/household-preferences-context";
import { isoYmdToHouseholdInputDisplay } from "@/lib/household-date-format";
import {
  createTherapyAppointment,
  createTherapyAppointmentSeries,
} from "../actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { defaultClinicJobId } from "@/lib/private-clinic/default-clinic-job-id";
import { resolveSessionDurationMinutes } from "@/lib/therapy/session-duration";
type JobOption = { id: string; label: string; defaultDurationMinutes: number | null };
type ProgramOption = { id: string; jobId: string; label: string; defaultDurationMinutes: number | null };
type ClientOption = {
  id: string;
  label: string;
  defaultJobId: string | null;
  defaultProgramId: string | null;
  defaultVisitType: string | null;
  defaultDurationMinutes: number | null;
};
type DowOption = { v: number; label: string };
type VisitOption = { value: string; label: string };

type Props = {
  copy: {
    recurringToggle: string;
    clientLabel: string;
    jobLabel: string;
    programOptional: string;
    visitTypeLabel: string;
    recurrenceLabel: string;
    dayOfWeekLabel: string;
    startDateTimeLabel: string;
    startDateLabel: string;
    startTimeLabel: string;
    endDateTimeLabel: string;
    durationMinutesLabel: string;
    timeOfDayLabel: string;
    seriesStartDateLabel: string;
    seriesEndDateOptionalLabel: string;
    schedule: string;
    createSeriesGenerate: string;
    savingLabel: string;
    weekly: string;
    biweekly: string;
  };
  visitOptions: VisitOption[];
  jobs: JobOption[];
  programs: ProgramOption[];
  clients: ClientOption[];
  dow: DowOption[];
  redirectOnSuccess: string;
  prefill?: {
    clientId?: string;
    jobId?: string;
    programId?: string;
    visitType?: string;
    startDate?: string;
    durationMinutes?: string;
  };
  allowRecurring?: boolean;
};

function dayOfWeekFromIsoDate(isoDate: string): number {
  if (!isoDate) return 0;
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function AppointmentAddForm({
  copy,
  visitOptions,
  jobs,
  programs,
  clients,
  dow,
  redirectOnSuccess,
  prefill,
  allowRecurring = true,
}: Props) {
  const dateDisplayFormat = useHouseholdDateFormat();
  const timeHourSuffix = copy.startTimeLabel.includes("שעה") || copy.timeOfDayLabel.includes("שעה") ? "שעה" : "hour";
  const timeMinuteSuffix =
    copy.startTimeLabel.includes("שעה") || copy.timeOfDayLabel.includes("שעה") ? "דקות" : "minute";
  const defaultJobId = defaultClinicJobId(jobs, prefill?.jobId);

  const [recurring, setRecurring] = useState(false);
  const [clientId, setClientId] = useState(prefill?.clientId ?? "");
  const [jobId, setJobId] = useState(defaultJobId);
  const [programId, setProgramId] = useState(prefill?.programId ?? "");
  const [visitType, setVisitType] = useState(prefill?.visitType ?? "");
  const [startDate, setStartDate] = useState(prefill?.startDate ?? "");
  const [startHour, setStartHour] = useState("");
  const [startMinute, setStartMinute] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(prefill?.durationMinutes ?? "");
  const [recurrence, setRecurrence] = useState<"weekly" | "biweekly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState(() => dayOfWeekFromIsoDate(prefill?.startDate ?? ""));
  const [seriesEndDate, setSeriesEndDate] = useState("");

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );

  const filteredPrograms = useMemo(
    () => (jobId ? programs.filter((p) => p.jobId === jobId) : []),
    [programs, jobId],
  );
  const programById = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);
  const jobById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")),
    [],
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0")),
    [],
  );
  const startTime = useMemo(() => {
    if (!startHour || !startMinute) return "";
    return `${startHour}:${startMinute}`;
  }, [startHour, startMinute]);
  const resolveDurationPrefill = (
    nextClientId: string,
    nextJobId: string,
    nextProgramId: string,
  ): number | null => {
    const client = nextClientId ? clientById.get(nextClientId) : undefined;
    const programDuration = nextProgramId
      ? programById.get(nextProgramId)?.defaultDurationMinutes ?? null
      : null;
    const jobDuration = nextJobId ? jobById.get(nextJobId)?.defaultDurationMinutes ?? null : null;
    return resolveSessionDurationMinutes({
      jobDefaultMinutes: jobDuration,
      programDefaultMinutes: programDuration,
      clientDefaultMinutes: client?.defaultDurationMinutes ?? null,
    });
  };

  const applyDurationPrefill = (nextDuration: number | null) => {
    if (nextDuration && nextDuration > 0) setDurationMinutes(String(nextDuration));
  };

  const startAtValue = useMemo(() => {
    if (!startDate || !startTime) return "";
    return `${startDate}T${startTime}`;
  }, [startDate, startTime]);

  const endAtValue = useMemo(() => {
    if (!startAtValue) return "";
    const parsedDuration = Number.parseInt(durationMinutes, 10);
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) return "";
    const start = new Date(startAtValue);
    if (Number.isNaN(start.getTime())) return "";
    const end = new Date(start.getTime() + parsedDuration * 60 * 1000);
    const local = new Date(end.getTime() - end.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }, [durationMinutes, startAtValue]);
  const endDateValue = endAtValue ? endAtValue.slice(0, 10) : "";
  const endTimeValue = endAtValue ? endAtValue.slice(11, 16) : "";
  const endDateTimeReadonlyDisplay = useMemo(() => {
    if (!endDateValue) return "";
    const datePart = isoYmdToHouseholdInputDisplay(endDateValue, dateDisplayFormat);
    return endTimeValue ? `${datePart} ${endTimeValue}` : datePart;
  }, [dateDisplayFormat, endDateValue, endTimeValue]);

  const handleRecurringToggle = (checked: boolean) => {
    if (checked && startDate) {
      setDayOfWeek(dayOfWeekFromIsoDate(startDate));
    }
    setRecurring(checked);
  };

  const handleStartDateChange = (iso: string) => {
    setStartDate(iso);
    if (recurring && iso) {
      setDayOfWeek(dayOfWeekFromIsoDate(iso));
    }
  };

  const handleClientChange = (nextClientId: string) => {
    setClientId(nextClientId);
    const selectedClient = clientById.get(nextClientId);
    if (!selectedClient) return;
    if (!jobId && selectedClient.defaultJobId) {
      const nextJobId = selectedClient.defaultJobId;
      const nextProgramId = selectedClient.defaultProgramId ?? "";
      setJobId(nextJobId);
      setProgramId(nextProgramId);
      if (selectedClient.defaultVisitType) setVisitType(selectedClient.defaultVisitType);
      applyDurationPrefill(resolveDurationPrefill(nextClientId, nextJobId, nextProgramId));
    } else {
      applyDurationPrefill(resolveDurationPrefill(nextClientId, jobId, programId));
    }
  };

  const formAction = recurring && allowRecurring ? createTherapyAppointmentSeries : createTherapyAppointment;
  const submitLabel = recurring && allowRecurring ? copy.createSeriesGenerate : copy.schedule;

  return (
    <div className="space-y-4">
      {allowRecurring ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => handleRecurringToggle(e.target.checked)}
            className="rounded border-slate-600"
          />
          {copy.recurringToggle}
        </label>
      ) : null}

      <form
        action={formAction}
        className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
      >
        <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
        {!recurring ? <input type="hidden" name="start_at" value={startAtValue} /> : null}
        {recurring && allowRecurring ? (
          <>
            <input type="hidden" name="time_of_day" value={startTime} />
            <input type="hidden" name="start_date" value={startDate} />
            <input type="hidden" name="end_date" value={seriesEndDate} />
          </>
        ) : null}

        <label className="space-y-1">
          <span className="block text-xs text-slate-300">{copy.clientLabel}</span>
          <select
            name="client_id"
            required
            value={clientId}
            onChange={(e) => handleClientChange(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value=""></option>
            {clients.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-slate-300">{copy.jobLabel}</span>
          <select
            name="job_id"
            required
            value={jobId}
            onChange={(e) => {
              const nextJobId = e.target.value;
              setJobId(nextJobId);
              setProgramId("");
              applyDurationPrefill(resolveDurationPrefill(clientId, nextJobId, ""));
            }}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value=""></option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-slate-300">{copy.programOptional}</span>
          <select
            name="program_id"
            value={programId}
            onChange={(e) => {
              const nextProgramId = e.target.value;
              setProgramId(nextProgramId);
              applyDurationPrefill(resolveDurationPrefill(clientId, jobId, nextProgramId));
            }}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value=""></option>
            {filteredPrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-slate-300">{copy.visitTypeLabel}</span>
          <select
            name="visit_type"
            required
            value={visitType}
            onChange={(e) => setVisitType(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value=""></option>
            {visitOptions.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </label>

        {recurring && allowRecurring ? (
          <>
            <label className="space-y-1">
              <span className="block text-xs text-slate-300">{copy.recurrenceLabel}</span>
              <select
                name="recurrence"
                required
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as "weekly" | "biweekly")}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="weekly">{copy.weekly}</option>
                <option value="biweekly">{copy.biweekly}</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-slate-300">{copy.dayOfWeekLabel}</span>
              <select
                name="day_of_week"
                required
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                {dow.map((d) => (
                  <option key={d.v} value={d.v}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        <div className="space-y-1">
          <span className="block text-xs text-slate-300">
            {recurring && allowRecurring ? copy.seriesStartDateLabel : copy.startDateTimeLabel}
          </span>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
            {!recurring ? <input type="hidden" name="start_date" value={startDate} /> : null}
            <HouseholdDateIsoControl
              valueIso={startDate}
              onIsoChange={handleStartDateChange}
              required
              className="w-full self-end rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              aria-label={copy.startDateLabel}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                required
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                aria-label={`${recurring ? copy.timeOfDayLabel : copy.startTimeLabel} ${timeHourSuffix}`}
              >
                <option value="">--</option>
                {hourOptions.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
              <select
                required
                value={startMinute}
                onChange={(e) => setStartMinute(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                aria-label={`${recurring ? copy.timeOfDayLabel : copy.startTimeLabel} ${timeMinuteSuffix}`}
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
        </div>

        {recurring && allowRecurring ? (
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.seriesEndDateOptionalLabel}</span>
            <HouseholdDateIsoControl
              valueIso={seriesEndDate}
              onIsoChange={setSeriesEndDate}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              aria-label={copy.seriesEndDateOptionalLabel}
            />
          </label>
        ) : (
          <>
            <label className="space-y-1">
              <span className="block text-xs text-slate-300">{copy.endDateTimeLabel}</span>
              <input type="hidden" name="end_at" value={endAtValue} />
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
                <input
                  type="text"
                  readOnly
                  value={endDateTimeReadonlyDisplay}
                  className="sm:col-span-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  aria-label={copy.endDateTimeLabel}
                />
              </div>
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-slate-300">{copy.durationMinutesLabel}</span>
              <input
                name="duration_minutes"
                type="number"
                min={1}
                max={999}
                step={1}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full max-w-32 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </>
        )}

        {recurring && allowRecurring ? (
          <label className="space-y-1">
            <span className="block text-xs text-slate-300">{copy.durationMinutesLabel}</span>
            <input
              name="duration_minutes"
              type="number"
              min={1}
              max={999}
              step={1}
              required
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full max-w-32 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </label>
        ) : null}

        <PendingSubmitButton
          label={submitLabel}
          pendingLabel={copy.savingLabel}
          className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </form>
    </div>
  );
}
