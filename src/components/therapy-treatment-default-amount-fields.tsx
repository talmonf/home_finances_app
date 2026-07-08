"use client";

import { useCallback, useMemo, useState } from "react";
import { HouseholdDateField } from "@/components/household-date-field";
import type { TherapyVisitType } from "@/generated/prisma/enums";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import type { UiLanguage } from "@/lib/ui-language";
import {
  resolveTherapyVisitTypeDefault,
  therapyVisitTypesOrdered,
  type VisitTypeDefaultRow,
} from "@/lib/therapy/visit-type-defaults";
import { defaultClinicJobId } from "@/lib/private-clinic/default-clinic-job-id";

type JobOpt = { id: string; job_title: string };
type ProgramOpt = { id: string; job_id: string; name: string };

/** Client-only: applies job/program/visit-type default amounts when logging a treatment. */
export function TherapyTreatmentDefaultAmountFields(props: {
  uiLanguage: UiLanguage;
  jobs: JobOpt[];
  programs: ProgramOpt[];
  visitDefaults: VisitTypeDefaultRow[];
  labels: {
    job: string;
    program: string;
    date: string;
    timeOptional: string;
    amount: string;
    currency: string;
    visitType: string;
    select: string;
    markReportedInExternalSystem: string;
  };
  clients: {
    id: string;
    default_job_id: string;
    default_program_id: string | null;
    default_visit_type: TherapyVisitType | null;
    agreed_fee_amount?: string | null;
    agreed_fee_currency?: string | null;
  }[];
  defaultClientId?: string;
  defaultValues?: {
    job_id?: string;
    program_id?: string;
    occurred_date?: string;
    occurred_time?: string;
    amount?: string;
    currency?: string;
    visit_type?: TherapyVisitType;
    reported_to_external_system?: boolean;
  };
  externalReportingJobIds?: string[];
}) {
  const {
    visitDefaults,
    jobs,
    programs,
    labels,
    uiLanguage,
    defaultValues,
    clients,
    defaultClientId,
    externalReportingJobIds = [],
  } = props;
  const inputFlatClass =
    "w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500";
  const controlClass = `mt-1 ${inputFlatClass}`;
  const selectSmClass =
    "w-full rounded-lg border border-slate-500 bg-slate-800 px-2 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500";
  const defaultClient = clients.find((cl) => cl.id === defaultClientId);

  const firstJobId = defaultClinicJobId(
    jobs,
    defaultValues?.job_id || defaultClient?.default_job_id || "",
  );
  const programsForFirst = useMemo(
    () => programs.filter((p) => p.job_id === firstJobId),
    [programs, firstJobId],
  );
  const requestedProgramId = defaultValues?.program_id || defaultClient?.default_program_id || "";
  const initialProgramId =
    (requestedProgramId && programs.some((p) => p.id === requestedProgramId) ? requestedProgramId : "") ||
    programsForFirst[0]?.id ||
    "";

  const initialVisit: TherapyVisitType | "" =
    defaultValues?.visit_type ??
    defaultClient?.default_visit_type ??
    (defaultClient ? "clinic" : "");
  const initialResolved = initialVisit
    ? resolveTherapyVisitTypeDefault(
        visitDefaults,
        firstJobId,
        initialProgramId,
        initialVisit,
      )
    : null;
  const clientAgreedFee =
    defaultClient?.agreed_fee_amount != null && String(defaultClient.agreed_fee_amount).trim() !== ""
      ? {
          amount: String(defaultClient.agreed_fee_amount),
          currency: defaultClient.agreed_fee_currency ?? "ILS",
        }
      : null;

  const [jobId, setJobId] = useState(firstJobId);
  const [programId, setProgramId] = useState(initialProgramId);
  const [visitType, setVisitType] = useState<TherapyVisitType | "">(initialVisit);
  // Parent often passes amount: "" when nothing was saved; empty string must not mask visit-type defaults.
  const [amount, setAmount] = useState(
    defaultValues?.amount !== undefined && defaultValues.amount !== ""
      ? defaultValues.amount
      : (clientAgreedFee?.amount ?? initialResolved?.amount ?? ""),
  );
  const [currency, setCurrency] = useState(
    defaultValues?.currency !== undefined && defaultValues.currency !== ""
      ? defaultValues.currency
      : (clientAgreedFee?.currency ?? initialResolved?.currency ?? "ILS"),
  );
  const [initialHour = "", initialMinute = ""] = (defaultValues?.occurred_time ?? "").slice(0, 5).split(":");
  const [occurredHour, setOccurredHour] = useState(initialHour);
  const [occurredMinute, setOccurredMinute] = useState(initialMinute);
  const occurredTimeValue = useMemo(() => {
    if (!occurredHour || !occurredMinute) return "";
    return `${occurredHour}:${occurredMinute}`;
  }, [occurredHour, occurredMinute]);
  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")),
    [],
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0")),
    [],
  );
  const hourSuffix = uiLanguage === "he" ? "שעה" : "hour";
  const minuteSuffix = uiLanguage === "he" ? "דקות" : "minute";

  const programsForJob = useMemo(() => programs.filter((p) => p.job_id === jobId), [programs, jobId]);

  const applyDefault = useCallback(
    (j: string, p: string, vt: TherapyVisitType | "") => {
      const client = clients.find((cl) => cl.id === defaultClientId);
      if (
        client?.agreed_fee_amount != null &&
        String(client.agreed_fee_amount).trim() !== ""
      ) {
        setAmount(String(client.agreed_fee_amount));
        setCurrency(client.agreed_fee_currency ?? "ILS");
        return;
      }
      if (!vt) return;
      const d = resolveTherapyVisitTypeDefault(visitDefaults, j, p, vt);
      if (d) {
        setAmount(d.amount);
        setCurrency(d.currency);
      }
    },
    [visitDefaults, clients, defaultClientId],
  );

  const onJobChange = (nextJobId: string) => {
    setJobId(nextJobId);
    const nextPrograms = programs.filter((x) => x.job_id === nextJobId);
    const nextProg = nextPrograms[0]?.id ?? "";
    setProgramId(nextProg);
    applyDefault(nextJobId, nextProg, visitType);
  };

  const onProgramChange = (nextProgramId: string) => {
    setProgramId(nextProgramId);
    applyDefault(jobId, nextProgramId, visitType);
  };

  const onVisitTypeChange = (vt: TherapyVisitType | "") => {
    setVisitType(vt);
    applyDefault(jobId, programId, vt);
  };

  const visitOptions = therapyVisitTypesOrdered();
  return (
    <>
      <div>
        <label className="block text-xs text-slate-400">{labels.job}</label>
        <select
          name="job_id"
          required
          value={jobId}
          onChange={(e) => onJobChange(e.target.value)}
          className={controlClass}
        >
          <option value="">{labels.select}</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.job_title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400">{labels.program}</label>
        <select
          name="program_id"
          required={programsForJob.length > 0}
          value={programId}
          onChange={(e) => onProgramChange(e.target.value)}
          className={controlClass}
        >
          <option value="">{labels.select}</option>
          {programsForJob.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400">{labels.visitType}</label>
        <select
          name="visit_type"
          required
          value={visitType}
          onChange={(e) => onVisitTypeChange(e.target.value as TherapyVisitType | "")}
          className={controlClass}
        >
          <option value="">{labels.select}</option>
          {visitOptions.map((v) => (
            <option key={v} value={v}>
              {therapyVisitTypeLabel(uiLanguage, v)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400">{labels.date}</label>
        <div className="mt-1">
          <HouseholdDateField
            name="occurred_date"
            defaultIsoYmd={defaultValues?.occurred_date ?? ""}
            required
            className={inputFlatClass}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400">{labels.timeOptional}</label>
        <input type="hidden" name="occurred_time" value={occurredTimeValue} />
        <div className="mt-1 grid max-w-36 grid-cols-2 gap-2">
          <select
            value={occurredHour}
            onChange={(e) => setOccurredHour(e.target.value)}
            className={selectSmClass}
            aria-label={`${labels.timeOptional} ${hourSuffix}`}
          >
            <option value="">--</option>
            {hourOptions.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
          <select
            value={occurredMinute}
            onChange={(e) => setOccurredMinute(e.target.value)}
            className={selectSmClass}
            aria-label={`${labels.timeOptional} ${minuteSuffix}`}
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
      <div>
        <label className="block text-xs text-slate-400">{labels.amount}</label>
        <input
          name="amount"
          type="text"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className={controlClass}
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400">{labels.currency}</label>
        <input
          name="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          placeholder="ILS"
          className={controlClass}
        />
      </div>
      {externalReportingJobIds.includes(jobId) ? (
        <label className="inline-flex items-center gap-2 text-sm text-slate-200 md:col-span-2">
          <input
            type="checkbox"
            name="reported_to_external_system"
            value="1"
            defaultChecked={Boolean(defaultValues?.reported_to_external_system)}
            className="h-4 w-4 rounded border-slate-500 bg-slate-900"
          />
          {labels.markReportedInExternalSystem}
        </label>
      ) : null}
    </>
  );
}
