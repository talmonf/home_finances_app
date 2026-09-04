import { HouseholdDateField } from "@/components/household-date-field";
import { utcDateToHtmlDateInputValue } from "@/lib/household-date-format";
import { OBFUSCATED } from "@/lib/privacy-display";
import { privateClinicClients, privateClinicCommon, privateClinicTreatments } from "@/lib/private-clinic-i18n";
import type { TherapyClientEndReason } from "@/lib/therapy/client-end-reason";
import { createTherapyClient, updateTherapyClient } from "../actions";
import { ClientJobProgramFields } from "./client-job-program-fields";
import { TherapyClientCareEndFields } from "./therapy-client-care-end-fields";
import type { TherapyClientFamilyOption, TherapyClientFormJobOption, TherapyClientFormProgramOption } from "./load-therapy-client-form-options";
import { PendingSubmitButtonWithSpinner } from "@/components/pending-submit-button-with-spinner";
import { TherapyClientPersonalDetailsFields } from "./therapy-client-personal-details-fields";
import { TherapyClientBillingSection } from "./therapy-client-billing-section";

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
  end_reason: TherapyClientEndReason | null;
  email: string | null;
  phones: string | null;
  address: string | null;
  visits_per_period_count: number | null;
  visits_per_period_weeks: number | null;
  disability_status: string | null;
  rehab_basket_status: string | null;
  notes: string | null;
  team_members: string | null;
  default_job_id: string;
  default_program_id: string | null;
  default_visit_type: "clinic" | "home" | "phone" | "video" | null;
  default_session_length_minutes: number | null;
  kupat_holim: "clalit" | "maccabi" | "meuhedet" | "leumit" | null;
  family_id: string | null;
  billing_basis: "per_treatment" | "per_month" | null;
  billing_timing: "in_advance" | "in_arrears" | null;
  agreed_fee_amount: string | { toString(): string } | null;
  agreed_fee_currency: string | null;
  default_payment_method: "bank_transfer" | "digital_payment" | "cash" | null;
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

function FormSectionHeading({ children, first }: { children: string; first?: boolean }) {
  return (
    <h2
      className={`md:col-span-2 text-sm font-semibold text-slate-200 ${
        first ? "" : "mt-2 border-t border-slate-800 pt-3"
      }`}
    >
      {children}
    </h2>
  );
}

export function TherapyClientForm({
  mode,
  obfuscate,
  jobs,
  programs,
  families,
  cl,
  c,
  uiLanguage,
  redirectOnError,
  pendingLabel,
  client,
}: {
  mode: "create" | "edit";
  obfuscate: boolean;
  jobs: TherapyClientFormJobOption[];
  programs: TherapyClientFormProgramOption[];
  families: TherapyClientFamilyOption[];
  cl: ClStrings;
  c: CommonStrings;
  uiLanguage: "en" | "he";
  redirectOnError: string;
  pendingLabel: string;
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
    defaultSessionLengthOptional: c.defaultSessionLengthMinutes,
    selectJob: cl.selectJob,
    none: c.none,
    alsoSeenUnder: cl.alsoSeenUnder,
    visitClinic: cl.visitClinic,
    visitHome: cl.visitHome,
    visitPhone: cl.visitPhone,
    visitVideo: cl.visitVideo,
    kupatHolimOptional: cl.kupatHolimOptional,
    kupatClalit: cl.kupatClalit,
    kupatMaccabi: cl.kupatMaccabi,
    kupatMeuhedet: cl.kupatMeuhedet,
    kupatLeumit: cl.kupatLeumit,
  };

  const rowId = client?.id ?? "new";
  const idPrefix = mode === "edit" ? rowId : "new";
  const hasPersonalDetails = Boolean(
    client?.last_name?.trim() ||
      client?.id_number?.trim() ||
      client?.email?.trim() ||
      phones.mobile ||
      phones.home ||
      client?.address?.trim(),
  );

  return (
    <form
      action={action}
      className="grid items-start gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
    >
      <input type="hidden" name="redirect_on_error" value={redirectOnError} />
      {mode === "edit" && client ? <input type="hidden" name="id" value={client.id} /> : null}

      <div className="flex flex-wrap items-end gap-3 md:col-span-2">
        <div className="min-w-[12rem] flex-1 space-y-1">
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

        <TherapyClientPersonalDetailsFields
          idPrefix={idPrefix}
          obfuscate={obfuscateEdit(obfuscate, mode)}
          lastName={client?.last_name ?? ""}
          idNumber={client?.id_number ?? ""}
          email={client?.email ?? ""}
          mobilePhone={phones.mobile}
          homePhone={phones.home}
          address={client?.address ?? ""}
          hasDetailsOnFile={hasPersonalDetails}
          labels={{
            personalDetailsBtn: cl.personalDetailsBtn,
            personalDetailsTitle: cl.personalDetailsTitle,
            personalDetailsOnFile: cl.personalDetailsOnFile,
            personalDetailsDone: cl.personalDetailsDone,
            lastNameOptional: cl.lastNameOptional,
            idOptional: cl.idOptional,
            email: cl.email,
            composeEmail: cl.composeEmail,
            callNumber: cl.callNumber,
            mobilePhone: cl.mobilePhone,
            homePhone: cl.homePhone,
            address: cl.address,
          }}
        />
      </div>

      <FormSectionHeading first>{cl.formSectionAssignment}</FormSectionHeading>

      <ClientJobProgramFields
        jobs={jobs}
        programs={programs}
        defaultJobId={client?.default_job_id}
        defaultProgramId={client?.default_program_id}
        defaultVisitType={client?.default_visit_type}
        defaultKupatHolim={client?.kupat_holim}
        defaultCheckedJobIds={client?.client_jobs.map((x) => x.job_id)}
        labels={jobFieldLabels}
        inheritProgramVisitFrequency={mode === "create"}
        visitFrequencyCountInputId={`${idPrefix}_visits_per_period_count`}
        visitFrequencyWeeksInputId={`${idPrefix}_visits_per_period_weeks`}
      />

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}_default_session_length`} className="block text-xs text-slate-400">
          {c.defaultSessionLengthMinutes}
        </label>
        <input
          id={`${idPrefix}_default_session_length`}
          name="default_session_length_minutes"
          type="number"
          min={1}
          max={999}
          step={1}
          defaultValue={client?.default_session_length_minutes ?? ""}
          className="w-full max-w-32 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <div className="space-y-1">
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

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}_start_date`} className="block text-xs text-slate-400">
          {c.startDate}
        </label>
        <HouseholdDateField
          id={`${idPrefix}_start_date`}
          name="start_date"
          defaultIsoYmd={utcDateToHtmlDateInputValue(client?.start_date ?? null)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <TherapyClientCareEndFields
        endDateInputId={`${idPrefix}_end_date`}
        defaultEndDateIso={utcDateToHtmlDateInputValue(client?.end_date ?? null)}
        defaultProgramId={client?.default_program_id}
        defaultEndReason={client?.end_reason ?? null}
        programs={programs}
        endDateLabel={cl.endDate}
        endReasonLabel={cl.endReason}
        selectPlaceholder={c.select}
        uiLanguage={uiLanguage}
        dateFieldClassName="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      />

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
            className="min-h-[3rem] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        ) : (
          <textarea
            id={`${idPrefix}_notes`}
            name="notes"
            defaultValue={client?.notes ?? ""}
            className="min-h-[3rem] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        )}
      </div>

      <div className="space-y-1 md:col-span-2">
        <label htmlFor={`${idPrefix}_team_members`} className="block text-xs text-slate-400">
          {cl.teamMembers}
        </label>
        <p className="text-xs text-slate-500">{cl.teamMembersHint}</p>
        <input
          id={`${idPrefix}_team_members`}
          name="team_members"
          defaultValue={client?.team_members ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <TherapyClientBillingSection
        jobs={jobs}
        families={families}
        defaultJobId={client?.default_job_id}
        familySelectId={`${idPrefix}_family_id`}
        initialFamilyId={client?.family_id}
        initialBillingBasis={client?.billing_basis}
        initialBillingTiming={client?.billing_timing}
        initialAgreedFeeAmount={
          client?.agreed_fee_amount != null ? String(client.agreed_fee_amount) : null
        }
        initialAgreedFeeCurrency={client?.agreed_fee_currency ?? "ILS"}
        initialDefaultPaymentMethod={client?.default_payment_method ?? null}
        labels={{
          sectionTitle: cl.formSectionBilling,
          none: c.none,
          agreedFeeOptional: cl.agreedFeeOptional,
          agreedFeeCurrency: cl.agreedFeeCurrency,
          defaultPaymentMethodOptional: cl.defaultPaymentMethodOptional,
          personalClientBillingHint: cl.personalClientBillingHint,
          paymentMethodUnset: privateClinicTreatments(uiLanguage).paymentMethodUnset,
          paymentBankTransfer: privateClinicTreatments(uiLanguage).paymentBankTransfer,
          paymentDigital: privateClinicTreatments(uiLanguage).paymentDigital,
          paymentCash: privateClinicTreatments(uiLanguage).paymentCash,
        }}
      />

      {mode === "edit" && client ? (
        <label className="flex flex-col gap-1 text-sm text-slate-300 md:col-span-2">
          <span className="flex items-center gap-2">
            <input type="checkbox" name="is_active" defaultChecked={client.is_active} />
            {cl.statusLabel}
          </span>
          <span className="text-xs font-normal text-slate-500">{cl.statusHelp}</span>
        </label>
      ) : null}

      <PendingSubmitButtonWithSpinner
        disabled={jobs.length === 0}
        className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        label={mode === "create" ? cl.addClientBtn : cl.saveClient}
        pendingLabel={pendingLabel}
      />
    </form>
  );
}
