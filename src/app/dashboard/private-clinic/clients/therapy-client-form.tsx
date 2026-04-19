import { OBFUSCATED } from "@/lib/privacy-display";
import { privateClinicClients, privateClinicCommon } from "@/lib/private-clinic-i18n";
import { createTherapyClient, updateTherapyClient } from "../actions";
import { ClientJobProgramFields } from "./client-job-program-fields";
import type { TherapyClientFormJobOption, TherapyClientFormProgramOption } from "./load-therapy-client-form-options";

type ClStrings = ReturnType<typeof privateClinicClients>;
type CommonStrings = ReturnType<typeof privateClinicCommon>;

const obfuscateEdit = (obfuscate: boolean, mode: "create" | "edit") => obfuscate && mode === "edit";

export type TherapyClientFormEditRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  id_number: string | null;
  start_date: Date | null;
  end_date: Date | null;
  email: string | null;
  phones: string | null;
  address: string | null;
  visits_per_period_count: number | null;
  visits_per_period_weeks: number | null;
  disability_status: string | null;
  rehab_basket_status: string | null;
  notes: string | null;
  default_job_id: string;
  default_program_id: string | null;
  default_visit_type: "clinic" | "home" | "phone" | "video" | null;
  is_active: boolean;
  client_jobs: { job_id: string }[];
};

function splitPhones(value: string | null | undefined): { mobile: string; home: string } {
  const text = value ?? "";
  const parts = text
    .split(/\r?\n|[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { mobile: parts[0] ?? "", home: parts[1] ?? "" };
}

function toDateInputValue(d: Date | null | undefined) {
  if (!d) return "";
  const z = new Date(d);
  const y = z.getFullYear();
  const m = String(z.getMonth() + 1).padStart(2, "0");
  const day = String(z.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TherapyClientForm({
  mode,
  obfuscate,
  jobs,
  programs,
  cl,
  c,
  redirectOnError,
  client,
}: {
  mode: "create" | "edit";
  obfuscate: boolean;
  jobs: TherapyClientFormJobOption[];
  programs: TherapyClientFormProgramOption[];
  cl: ClStrings;
  c: CommonStrings;
  redirectOnError: string;
  client?: TherapyClientFormEditRow;
}) {
  const action = mode === "create" ? createTherapyClient : updateTherapyClient;
  const phones = client ? splitPhones(client.phones) : { mobile: "", home: "" };
  const statusOptions = [
    { value: "none", label: cl.statusNone },
    { value: "exists", label: cl.statusExists },
    { value: "filed_in_hospitalization", label: cl.statusFiledInHospitalization },
    { value: "filed_recognized", label: cl.statusFiledRecognized },
    { value: "filed_rejected", label: cl.statusFiledRejected },
    { value: "filed_appeal", label: cl.statusFiledAppeal },
    { value: "filed_worsening", label: cl.statusFiledWorsening },
  ];
  const jobFieldLabels = {
    defaultJob: cl.defaultJob,
    defaultProgramOptional: cl.defaultProgramOptional,
    defaultVisitTypeOptional: cl.defaultVisitTypeOptional,
    selectJob: cl.selectJob,
    none: c.none,
    alsoSeenUnder: cl.alsoSeenUnder,
    visitClinic: cl.visitClinic,
    visitHome: cl.visitHome,
    visitPhone: cl.visitPhone,
    visitVideo: cl.visitVideo,
  };

  const rowId = client?.id ?? "new";
  const idPrefix = mode === "edit" ? rowId : "new";

  return (
    <form
      action={action}
      className="grid items-start gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
    >
      <input type="hidden" name="redirect_on_error" value={redirectOnError} />
      {mode === "edit" && client ? <input type="hidden" name="id" value={client.id} /> : null}

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}_first_name`} className="block text-xs text-slate-400">
          {cl.firstName}
        </label>
        {obfuscateEdit(obfuscate, mode) && client ? (
          <input type="hidden" name="first_name" value={client.first_name} />
        ) : null}
        {obfuscateEdit(obfuscate, mode) ? (
          <input
            id={`${idPrefix}_first_name`}
            readOnly
            value={OBFUSCATED}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        ) : (
          <input
            id={`${idPrefix}_first_name`}
            name="first_name"
            required
            defaultValue={client?.first_name ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}_last_name`} className="block text-xs text-slate-400">
          {cl.lastNameOptional}
        </label>
        {obfuscateEdit(obfuscate, mode) && client ? <input type="hidden" name="last_name" value={client.last_name ?? ""} /> : null}
        {obfuscateEdit(obfuscate, mode) ? (
          <input
            id={`${idPrefix}_last_name`}
            readOnly
            value={OBFUSCATED}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        ) : (
          <input
            id={`${idPrefix}_last_name`}
            name="last_name"
            defaultValue={client?.last_name ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}_id_number`} className="block text-xs text-slate-400">
          {cl.idOptional}
        </label>
        {obfuscateEdit(obfuscate, mode) && client ? (
          <input type="hidden" name="id_number" value={client.id_number ?? ""} />
        ) : null}
        {obfuscateEdit(obfuscate, mode) ? (
          <input
            id={`${idPrefix}_id_number`}
            readOnly
            value={client?.id_number ? OBFUSCATED : ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        ) : (
          <input
            id={`${idPrefix}_id_number`}
            name="id_number"
            defaultValue={client?.id_number ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${idPrefix}_email`} className="block text-xs text-slate-400">
            {cl.email}
          </label>
          {client?.email && !obfuscate ? (
            <a href={`mailto:${client.email}`} className="shrink-0 text-xs text-sky-400 hover:text-sky-300">
              {cl.composeEmail}
            </a>
          ) : null}
        </div>
        {obfuscateEdit(obfuscate, mode) && client ? <input type="hidden" name="email" value={client.email ?? ""} /> : null}
        {obfuscateEdit(obfuscate, mode) && client ? (
          <input
            id={`${idPrefix}_email`}
            readOnly
            value={client.email ? OBFUSCATED : ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        ) : (
          <input
            id={`${idPrefix}_email`}
            name="email"
            type="email"
            defaultValue={client?.email ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${idPrefix}_mobile_phone`} className="block text-xs text-slate-400">
            {cl.mobilePhone}
          </label>
          {phones.mobile && !obfuscate ? (
            <a href={`tel:${phones.mobile}`} className="shrink-0 text-xs text-sky-400 hover:text-sky-300">
              {cl.callNumber}
            </a>
          ) : null}
        </div>
        {obfuscateEdit(obfuscate, mode) ? (
          <>
            <input type="hidden" name="mobile_phone" value={phones.mobile} />
            <input
              id={`${idPrefix}_mobile_phone`}
              readOnly
              value={phones.mobile ? OBFUSCATED : ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </>
        ) : (
          <input
            id={`${idPrefix}_mobile_phone`}
            name="mobile_phone"
            defaultValue={phones.mobile}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${idPrefix}_home_phone`} className="block text-xs text-slate-400">
            {cl.homePhone}
          </label>
          {phones.home && !obfuscate ? (
            <a href={`tel:${phones.home}`} className="shrink-0 text-xs text-sky-400 hover:text-sky-300">
              {cl.callNumber}
            </a>
          ) : null}
        </div>
        {obfuscateEdit(obfuscate, mode) ? (
          <>
            <input type="hidden" name="home_phone" value={phones.home} />
            <input
              id={`${idPrefix}_home_phone`}
              readOnly
              value={phones.home ? OBFUSCATED : ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </>
        ) : (
          <input
            id={`${idPrefix}_home_phone`}
            name="home_phone"
            defaultValue={phones.home}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        )}
      </div>

      <div className="space-y-1 md:col-span-2">
        <label htmlFor={`${idPrefix}_address`} className="block text-xs text-slate-400">
          {cl.address}
        </label>
        {obfuscateEdit(obfuscate, mode) && client ? <input type="hidden" name="address" value={client.address ?? ""} /> : null}
        {obfuscateEdit(obfuscate, mode) ? (
          <input
            id={`${idPrefix}_address`}
            readOnly
            value={client?.address ? OBFUSCATED : ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        ) : (
          <input
            id={`${idPrefix}_address`}
            name="address"
            defaultValue={client?.address ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}_start_date`} className="block text-xs text-slate-400">
          {c.startDate}
        </label>
        <input
          id={`${idPrefix}_start_date`}
          name="start_date"
          type="date"
          defaultValue={toDateInputValue(client?.start_date)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}_end_date`} className="block text-xs text-slate-400">
          {cl.endDate}
        </label>
        <input
          id={`${idPrefix}_end_date`}
          name="end_date"
          type="date"
          defaultValue={toDateInputValue(client?.end_date)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}_disability_status`} className="block text-xs text-slate-400">
          {cl.disabilityStatus}
        </label>
        <select
          id={`${idPrefix}_disability_status`}
          name="disability_status"
          defaultValue={client?.disability_status ?? "none"}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}_rehab_basket_status`} className="block text-xs text-slate-400">
          {cl.rehabBasketStatus}
        </label>
        <select
          id={`${idPrefix}_rehab_basket_status`}
          name="rehab_basket_status"
          defaultValue={client?.rehab_basket_status ?? "none"}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1 md:col-span-2">
        <label htmlFor={`${idPrefix}_notes`} className="block text-xs text-slate-400">
          {c.notes}
        </label>
        {obfuscateEdit(obfuscate, mode) && client ? <input type="hidden" name="notes" value={client.notes ?? ""} /> : null}
        {obfuscateEdit(obfuscate, mode) && client ? (
          <textarea
            id={`${idPrefix}_notes`}
            readOnly
            value={client?.notes ? OBFUSCATED : ""}
            className="min-h-[4.5rem] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        ) : (
          <textarea
            id={`${idPrefix}_notes`}
            name="notes"
            defaultValue={client?.notes ?? ""}
            className="min-h-[4.5rem] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        )}
      </div>

      <ClientJobProgramFields
        jobs={jobs}
        programs={programs}
        defaultJobId={client?.default_job_id}
        defaultProgramId={client?.default_program_id}
        defaultVisitType={client?.default_visit_type}
        defaultCheckedJobIds={client?.client_jobs.map((x) => x.job_id)}
        labels={jobFieldLabels}
        inheritProgramVisitFrequency={mode === "create"}
        visitFrequencyCountInputId={`${idPrefix}_visits_per_period_count`}
        visitFrequencyWeeksInputId={`${idPrefix}_visits_per_period_weeks`}
      />

      <div className="space-y-1 md:col-span-2">
        <p className="text-xs text-slate-400">{cl.visitFrequency}</p>
        {mode === "create" ? (
          <p className="text-xs text-slate-500">{cl.visitFrequencyClientHint}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`${idPrefix}_visits_per_period_count`}>
            {cl.visitsPer}
          </label>
          <input
            id={`${idPrefix}_visits_per_period_count`}
            name="visits_per_period_count"
            type="number"
            min={1}
            max={14}
            step={1}
            defaultValue={client?.visits_per_period_count ?? ""}
            className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <span className="text-xs text-slate-400">{cl.visitsPer}</span>
          <label className="sr-only" htmlFor={`${idPrefix}_visits_per_period_weeks`}>
            {cl.weeks}
          </label>
          <input
            id={`${idPrefix}_visits_per_period_weeks`}
            name="visits_per_period_weeks"
            type="number"
            min={1}
            max={12}
            step={1}
            defaultValue={client?.visits_per_period_weeks ?? ""}
            className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <span className="text-xs text-slate-400">{cl.weeks}</span>
        </div>
      </div>

      {mode === "edit" && client ? (
        <label className="flex flex-col gap-1 text-sm text-slate-300 md:col-span-2">
          <span className="flex items-center gap-2">
            <input type="checkbox" name="is_active" defaultChecked={client.is_active} />
            {cl.statusLabel}
          </span>
          <span className="text-xs font-normal text-slate-500">{cl.statusHelp}</span>
        </label>
      ) : null}

      <button
        type="submit"
        disabled={jobs.length === 0}
        className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mode === "create" ? cl.addClientBtn : cl.saveClient}
      </button>
    </form>
  );
}
