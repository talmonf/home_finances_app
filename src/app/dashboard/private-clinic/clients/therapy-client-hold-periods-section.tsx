import { HouseholdDateField } from "@/components/household-date-field";
import { PendingSubmitButtonWithSpinner } from "@/components/pending-submit-button-with-spinner";
import type { TherapyClientHoldReason } from "@/generated/prisma/enums";
import { formatHouseholdDate, utcDateToHtmlDateInputValue } from "@/lib/household-date-format";
import type { HouseholdDateDisplayFormat } from "@/lib/household-date-format";
import { clinicCalendarTodayUtc, formatUtcYmd } from "@/lib/private-clinic/clinic-dashboard-range";
import { privateClinicClients, privateClinicCommon } from "@/lib/private-clinic-i18n";
import {
  deleteTherapyClientHoldPeriod,
  placeTherapyClientOnHold,
  updateTherapyClientHoldPeriod,
} from "../actions";

type ClStrings = ReturnType<typeof privateClinicClients>;
type CommonStrings = ReturnType<typeof privateClinicCommon>;

const HOLD_REASONS: TherapyClientHoldReason[] = ["hospital", "other"];

function holdReasonLabel(cl: ClStrings, reason: TherapyClientHoldReason | null): string {
  if (reason === "hospital") return cl.holdReasonHospital;
  if (reason === "other") return cl.holdReasonOther;
  return cl.holdReasonNone;
}

export type TherapyClientHoldPeriodRow = {
  id: string;
  started_on: Date;
  ended_on: Date | null;
  reason: TherapyClientHoldReason | null;
  notes: string | null;
};

const fieldClass = "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100";
const saveBtnClass =
  "inline-flex w-fit items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50";
const deleteBtnClass =
  "inline-flex items-center rounded-lg border border-rose-700 px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/50 disabled:cursor-not-allowed disabled:opacity-60";
const addBtnClass =
  "inline-flex w-fit items-center rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50";

export function TherapyClientHoldPeriodsSection({
  cl,
  c,
  obfuscate,
  clientId,
  redirectOnError,
  dateDisplayFormat,
  pendingLabel,
  periods,
}: {
  cl: ClStrings;
  c: CommonStrings;
  obfuscate: boolean;
  clientId: string;
  redirectOnError: string;
  dateDisplayFormat: HouseholdDateDisplayFormat;
  pendingLabel: string;
  periods: TherapyClientHoldPeriodRow[];
}) {
  const todayYmd = formatUtcYmd(clinicCalendarTodayUtc());
  const sorted = [...periods].sort((a, b) => b.started_on.getTime() - a.started_on.getTime());
  const open = sorted.find((p) => p.ended_on == null) ?? null;
  const statusLabel = open
    ? cl.holdOnHoldSince(formatHouseholdDate(open.started_on, dateDisplayFormat))
    : cl.holdStatusInService;

  return (
    <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">{cl.holdPeriodsTitle}</h2>
          <p className="mt-1 text-xs text-slate-500">{cl.holdPeriodsHelp}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            open ? "bg-amber-950/80 text-amber-200" : "bg-emerald-950/80 text-emerald-200"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {sorted.length > 0 ? (
        <ul className="space-y-3">
          {sorted.map((row) => (
            <li key={row.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <form action={updateTherapyClientHoldPeriod} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="client_id" value={clientId} />
                <input type="hidden" name="redirect_on_error" value={redirectOnError} />
                <div className="space-y-1">
                  <label htmlFor={`hold_start_${row.id}`} className="block text-xs text-slate-400">
                    {cl.holdColStart}
                  </label>
                  <HouseholdDateField
                    id={`hold_start_${row.id}`}
                    name="started_on"
                    required
                    defaultIsoYmd={utcDateToHtmlDateInputValue(row.started_on)}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`hold_end_${row.id}`} className="block text-xs text-slate-400">
                    {cl.holdColReturned}
                  </label>
                  <HouseholdDateField
                    id={`hold_end_${row.id}`}
                    name="ended_on"
                    defaultIsoYmd={utcDateToHtmlDateInputValue(row.ended_on)}
                    className={fieldClass}
                    aria-label={row.ended_on ? cl.holdColReturned : cl.holdStillOnHold}
                  />
                  {!row.ended_on ? (
                    <p className="text-xs text-slate-500">{cl.holdReturnedHint}</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <label htmlFor={`hold_reason_${row.id}`} className="block text-xs text-slate-400">
                    {cl.holdColReason}
                  </label>
                  <select
                    id={`hold_reason_${row.id}`}
                    name="reason"
                    defaultValue={row.reason ?? ""}
                    className={fieldClass}
                  >
                    <option value="">{cl.holdReasonNone}</option>
                    {HOLD_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {holdReasonLabel(cl, r)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor={`hold_notes_${row.id}`} className="block text-xs text-slate-400">
                    {cl.holdColNotes}
                  </label>
                  <input
                    id={`hold_notes_${row.id}`}
                    name="notes"
                    defaultValue={row.notes ?? ""}
                    placeholder={cl.holdNotesPlaceholder}
                    className={fieldClass}
                  />
                </div>
                {!obfuscate ? (
                  <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                    <PendingSubmitButtonWithSpinner
                      label={c.save}
                      pendingLabel={pendingLabel}
                      className={saveBtnClass}
                    />
                    <PendingSubmitButtonWithSpinner
                      label={c.delete}
                      pendingLabel={pendingLabel}
                      formAction={deleteTherapyClientHoldPeriod}
                      className={deleteBtnClass}
                    />
                  </div>
                ) : null}
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{cl.holdEmptyList}</p>
      )}

      {!obfuscate && !open ? (
        <form
          action={placeTherapyClientOnHold}
          className="grid gap-3 border-t border-slate-800 pt-3 md:grid-cols-2"
        >
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="redirect_on_error" value={redirectOnError} />
          <div className="space-y-1">
            <label htmlFor={`hold_new_start_${clientId}`} className="block text-xs text-slate-400">
              {cl.holdColStart}
            </label>
            <HouseholdDateField
              id={`hold_new_start_${clientId}`}
              name="started_on"
              required
              defaultIsoYmd={todayYmd}
              className={fieldClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`hold_new_reason_${clientId}`} className="block text-xs text-slate-400">
              {cl.holdColReason}
            </label>
            <select
              id={`hold_new_reason_${clientId}`}
              name="reason"
              defaultValue=""
              className={fieldClass}
            >
              <option value="">{cl.holdReasonNone}</option>
              {HOLD_REASONS.map((r) => (
                <option key={r} value={r}>
                  {holdReasonLabel(cl, r)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor={`hold_new_notes_${clientId}`} className="block text-xs text-slate-400">
              {cl.holdColNotes}
            </label>
            <input
              id={`hold_new_notes_${clientId}`}
              name="notes"
              placeholder={cl.holdNotesPlaceholder}
              className={fieldClass}
            />
          </div>
          <PendingSubmitButtonWithSpinner
            label={cl.holdPlaceOnHold}
            pendingLabel={pendingLabel}
            className={addBtnClass}
          />
        </form>
      ) : null}
    </section>
  );
}
