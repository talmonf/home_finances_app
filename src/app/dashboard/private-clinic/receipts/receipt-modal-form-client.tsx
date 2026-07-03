"use client";

import { useMemo, useState, type ReactNode } from "react";
import { HouseholdDateField } from "@/components/household-date-field";
import type { MorningReceiptNumberingMode } from "@/generated/prisma/client";
import {
  defaultReceiptNumberingChoiceOnCreate,
  resolveIssueViaMorningOnCreate,
  showReceiptNumberingChoiceOnCreate,
  type ReceiptNumberingChoice,
} from "@/lib/morning/receipt-numbering";
import { ReceiptPeriodPreview, type ReceiptPeriodPreviewLabels } from "./receipt-period-preview";

type JobOption = {
  id: string;
  label: string;
  defaultReceiptKind: "regular" | "salary_fictitious";
  defaultCoveredPeriodToPreviousMonth: boolean;
};

type ClientOption = { id: string; first_name: string; last_name: string | null; jobIds: string[] };

type ProgramOption = { id: string; jobId: string; label: string };

function localDateToIsoYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function previousMonthPeriod(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const end = new Date(today.getFullYear(), today.getMonth(), 0);
  return { start: localDateToIsoYmd(start), end: localDateToIsoYmd(end) };
}

export type ReceiptModalLabels = {
  titleNew: string;
  titleEdit: string;
  save: string;
  cancel: string;
  job: string;
  program: string;
  programOptionalEmpty: string;
  client: string;
  selectClient: string;
  receiptNumber: string;
  date: string;
  grossAmount: string;
  grossAmountHint: string;
  netAmount: string;
  netAmountHint: string;
  receiptKind: string;
  receiptKindRegular: string;
  receiptKindSalaryFictitious: string;
  currency: string;
  coveredStart: string;
  coveredEnd: string;
  recipient: string;
  selectRecipient: string;
  paymentMethod: string;
  selectPaymentMethod: string;
  notes: string;
  recipientClient: string;
  recipientOrg: string;
  paymentCash: string;
  paymentBank: string;
  paymentDigital: string;
  paymentCredit: string;
  paymentDate: string;
  paymentDateHint: string;
  linkBankOptional: string;
  morningConnectedBadge: string;
  morningReceiptNumberHint: string;
  receiptNumberingChoiceLabel: string;
  receiptNumberingMorning: string;
  receiptNumberingManual: string;
  receiptNumberingManualHint: string;
  downloadDocument: string;
  retryMorningIssue: string;
  morningIssueFailed: string;
  morningIssued: string;
};

export type ReceiptModalPeriodPreviewLabels = ReceiptPeriodPreviewLabels;

export type ReceiptModalInitial = {
  id?: string;
  job_id?: string;
  program_id?: string;
  client_id?: string;
  receipt_number?: string;
  issued_at?: string;
  total_amount?: string;
  net_amount?: string;
  receipt_kind?: "regular" | "salary_fictitious" | "";
  currency?: string;
  covered_period_start?: string;
  covered_period_end?: string;
  recipient_type?: "client" | "organization" | "";
  payment_method?: "cash" | "bank_transfer" | "digital_card" | "credit_card" | "";
  payment_date?: string;
  linked_transaction_id?: string;
  notes?: string;
  morning_locked?: boolean;
  morning_issue_failed?: boolean;
  morning_issue_error?: string;
  document_download_href?: string;
  receipt_number_is_pending?: boolean;
};

export type MorningNumberingConfigForForm = {
  enabled: boolean;
  mode: MorningReceiptNumberingMode;
};

export function ReceiptModalFormClient({
  action,
  mode,
  closeHref,
  redirectOnSuccess,
  redirectOnError,
  jobs,
  programs,
  clients,
  labels,
  initial,
  extraContent,
  formExtraContent,
  periodPreviewLabels,
  periodPreviewVisitTypeOptions,
  showBankLink = true,
  morningNumberingByJobId = {},
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  closeHref: string;
  redirectOnSuccess: string;
  redirectOnError: string;
  jobs: JobOption[];
  programs: ProgramOption[];
  clients: ClientOption[];
  labels: ReceiptModalLabels;
  initial?: ReceiptModalInitial;
  extraContent?: ReactNode;
  formExtraContent?: ReactNode;
  periodPreviewLabels?: ReceiptModalPeriodPreviewLabels;
  periodPreviewVisitTypeOptions?: { id: string; label: string }[];
  /** When false, bank link UI is omitted (clinic-only households). */
  showBankLink?: boolean;
  morningNumberingByJobId?: Record<string, MorningNumberingConfigForForm>;
  /** Server-rendered transaction picker (passed from parent Server Component). */
  children?: ReactNode;
}) {
  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const [jobId, setJobId] = useState(() => initial?.job_id ?? "");
  const morningConfig = jobId ? morningNumberingByJobId[jobId] : undefined;
  const morningEnabledForJob = Boolean(morningConfig?.enabled);
  const numberingMode = morningConfig?.mode ?? "ask_each_time";
  const [numberingChoice, setNumberingChoice] = useState<ReceiptNumberingChoice>(() =>
    defaultReceiptNumberingChoiceOnCreate(numberingMode),
  );
  const issueViaMorningOnForm = resolveIssueViaMorningOnCreate({
    morningIntegrationEnabled: morningEnabledForJob,
    numberingMode,
    formChoice: numberingChoice,
  });
  const showNumberingChoice =
    mode === "create" && showReceiptNumberingChoiceOnCreate(morningEnabledForJob, numberingMode);
  const [programId, setProgramId] = useState(initial?.program_id ?? "");
  const [recipientType, setRecipientType] = useState<string>(initial?.recipient_type ?? "");
  const [paymentMethod, setPaymentMethod] = useState<string>(initial?.payment_method ?? "");
  const [clientId, setClientId] = useState(initial?.client_id ?? "");
  const [receiptKind, setReceiptKind] = useState<string>(initial?.receipt_kind ?? "");
  const [coveredPeriodStart, setCoveredPeriodStart] = useState(initial?.covered_period_start ?? "");
  const [coveredPeriodEnd, setCoveredPeriodEnd] = useState(initial?.covered_period_end ?? "");
  const [grossAmount, setGrossAmount] = useState(initial?.total_amount ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "ILS");
  const [isDirty, setIsDirty] = useState(mode === "create");
  const canSubmit = mode === "create" || isDirty;
  const hideReceiptNumberInput =
    Boolean(initial?.morning_locked) || (mode === "create" && issueViaMorningOnForm);

  const programsForJob = useMemo(
    () => (jobId ? programs.filter((p) => p.jobId === jobId) : []),
    [programs, jobId],
  );
  const previewProgramOptions = useMemo(
    () => programsForJob.map((p) => ({ id: p.id, label: p.label })),
    [programsForJob],
  );

  const clientsForJob = useMemo(() => {
    if (!jobId) return clients;
    const filtered = clients.filter((cl) => cl.jobIds.includes(jobId));
    const currentId = initial?.client_id;
    if (currentId && mode === "edit" && !filtered.some((c) => c.id === currentId)) {
      const extra = clients.find((c) => c.id === currentId);
      if (extra) return [...filtered, extra];
    }
    return filtered;
  }, [clients, jobId, initial?.client_id, mode]);

  function applyJobDefaults(nextJobId: string) {
    const defaults = jobsById.get(nextJobId);
    if (!defaults) return;
    setReceiptKind(defaults.defaultReceiptKind);
    if (mode === "create" && defaults.defaultCoveredPeriodToPreviousMonth) {
      const previousMonth = previousMonthPeriod();
      setCoveredPeriodStart(previousMonth.start);
      setCoveredPeriodEnd(previousMonth.end);
      const nextConfig = morningNumberingByJobId[nextJobId];
      const nextMode = nextConfig?.mode ?? "ask_each_time";
      const nextChoice = defaultReceiptNumberingChoiceOnCreate(nextMode);
      const nextIssueViaMorning = resolveIssueViaMorningOnCreate({
        morningIntegrationEnabled: Boolean(nextConfig?.enabled),
        numberingMode: nextMode,
        formChoice: nextChoice,
      });
      if (nextIssueViaMorning) {
        setRecipientType("client");
      } else {
        setRecipientType("organization");
        setClientId("");
      }
    }
  }

  function clientBelongsToJob(nextClientId: string, nextJobId: string): boolean {
    const client = clients.find((cl) => cl.id === nextClientId);
    if (!client) return false;
    return !nextJobId || client.jobIds.includes(nextJobId);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
      <div className="max-h-[92vh] w-full max-w-screen-2xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-100">{mode === "create" ? labels.titleNew : labels.titleEdit}</h2>
          <a href={closeHref} className="text-sm text-sky-400 hover:text-sky-300">
            {labels.cancel}
          </a>
        </div>
        <form action={action} onChangeCapture={() => setIsDirty(true)} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
          <input type="hidden" name="redirect_on_error" value={redirectOnError} />
          {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

          <div>
            <label className="block text-xs text-slate-400">{labels.job}</label>
            <select
              name="job_id"
              required
              value={jobId}
              onChange={(e) => {
                const v = e.target.value;
                setJobId(v);
                setProgramId("");
                const nextConfig = morningNumberingByJobId[v];
                setNumberingChoice(
                  defaultReceiptNumberingChoiceOnCreate(nextConfig?.mode ?? "ask_each_time"),
                );
                applyJobDefaults(v);
                if (recipientType === "client" && clientId && !clientBelongsToJob(clientId, v)) {
                  setClientId("");
                }
              }}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value=""></option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.program}</label>
            <select
              name="program_id"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value=""></option>
              {programsForJob.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            {showNumberingChoice ? (
              <fieldset className="mb-2 space-y-2">
                <legend className="text-xs text-slate-400">{labels.receiptNumberingChoiceLabel}</legend>
                <label className="flex items-start gap-2 text-sm text-slate-200">
                  <input
                    type="radio"
                    name="receipt_numbering_choice"
                    value="morning"
                    checked={numberingChoice === "morning"}
                    onChange={() => setNumberingChoice("morning")}
                    className="mt-1"
                  />
                  <span>{labels.receiptNumberingMorning}</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-200">
                  <input
                    type="radio"
                    name="receipt_numbering_choice"
                    value="manual"
                    checked={numberingChoice === "manual"}
                    onChange={() => setNumberingChoice("manual")}
                    className="mt-1"
                  />
                  <span className="space-y-1">
                    <span className="block">{labels.receiptNumberingManual}</span>
                    <span className="block text-xs text-slate-400">{labels.receiptNumberingManualHint}</span>
                  </span>
                </label>
              </fieldset>
            ) : null}
            {!showNumberingChoice && morningEnabledForJob && numberingMode === "morning_auto" ? (
              <input type="hidden" name="receipt_numbering_choice" value="morning" />
            ) : null}
            {!showNumberingChoice && morningEnabledForJob && numberingMode === "manual" ? (
              <input type="hidden" name="receipt_numbering_choice" value="manual" />
            ) : null}
            <label className="block text-xs text-slate-400">{labels.receiptNumber}</label>
            {hideReceiptNumberInput ? (
              <p className="mt-1 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
                {mode === "create" ? labels.morningReceiptNumberHint : initial?.receipt_number}
              </p>
            ) : (
              <input
                name="receipt_number"
                required
                defaultValue={
                  initial?.receipt_number_is_pending ? "" : (initial?.receipt_number ?? "")
                }
                placeholder={
                  initial?.receipt_number_is_pending ? initial.receipt_number : undefined
                }
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            )}
            {mode === "create" && issueViaMorningOnForm ? (
              <p className="mt-1 text-xs text-emerald-300">{labels.morningConnectedBadge}</p>
            ) : null}
            {initial?.receipt_number_is_pending ? (
              <p className="mt-1 text-xs text-amber-200">{labels.receiptNumberingManualHint}</p>
            ) : null}
            {initial?.morning_locked && initial.document_download_href ? (
              <a
                href={initial.document_download_href}
                className="mt-2 inline-flex text-xs text-sky-400 hover:text-sky-300"
                target="_blank"
                rel="noreferrer"
              >
                {labels.downloadDocument}
              </a>
            ) : null}
            {initial?.morning_issue_failed ? (
              <p className="mt-2 text-xs text-rose-300">
                {labels.morningIssueFailed}
                {initial.morning_issue_error ? `: ${initial.morning_issue_error}` : ""}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.recipient}</label>
            <select
              name="recipient_type"
              required
              value={recipientType}
              onChange={(e) => {
                const v = e.target.value;
                setRecipientType(v);
                if (v === "organization") setClientId("");
              }}
              disabled={mode === "create" && issueViaMorningOnForm}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 disabled:opacity-70"
            >
              <option value=""></option>
              <option value="client">{labels.recipientClient}</option>
              {mode === "create" && issueViaMorningOnForm ? null : (
                <option value="organization">{labels.recipientOrg}</option>
              )}
            </select>
          </div>

          {recipientType === "client" ? (
            <div>
              <label className="block text-xs text-slate-400">{labels.client}</label>
              <select
                name="client_id"
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{labels.selectClient}</option>
                {clientsForJob.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.first_name} {cl.last_name ?? ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="client_id" value="" />
          )}

          <div>
            <label className="block text-xs text-slate-400">{labels.date}</label>
            <div className="mt-1">
              <HouseholdDateField
                name="issued_at"
                required
                defaultIsoYmd={initial?.issued_at ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.paymentDate}</label>
            <div className="mt-1">
              <HouseholdDateField
                name="payment_date"
                defaultIsoYmd={initial?.payment_date ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.grossAmount}</label>
            <p className="mt-0.5 text-xs text-slate-500">{labels.grossAmountHint}</p>
            <input
              name="total_amount"
              required
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.netAmount}</label>
            <p className="mt-0.5 text-xs text-slate-500">{labels.netAmountHint}</p>
            <input
              name="net_amount"
              required
              defaultValue={initial?.net_amount ?? initial?.total_amount ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.receiptKind}</label>
            <select
              name="receipt_kind"
              required
              value={receiptKind}
              onChange={(e) => setReceiptKind(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="regular">{labels.receiptKindRegular}</option>
              <option value="salary_fictitious">{labels.receiptKindSalaryFictitious}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.currency}</label>
            <input
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.coveredStart}</label>
            <div className="mt-1">
              <HouseholdDateField
                name="covered_period_start"
                defaultIsoYmd={coveredPeriodStart}
                onIsoChange={setCoveredPeriodStart}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.coveredEnd}</label>
            <div className="mt-1">
              <HouseholdDateField
                name="covered_period_end"
                defaultIsoYmd={coveredPeriodEnd}
                onIsoChange={setCoveredPeriodEnd}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>

          {mode === "create" && periodPreviewLabels ? (
            <ReceiptPeriodPreview
              jobId={jobId}
              coveredPeriodStart={coveredPeriodStart}
              coveredPeriodEnd={coveredPeriodEnd}
              grossAmount={grossAmount}
              currency={currency}
              labels={periodPreviewLabels}
              programOptions={previewProgramOptions}
              visitTypeOptions={periodPreviewVisitTypeOptions ?? []}
            />
          ) : null}

          <div>
            <label className="block text-xs text-slate-400">{labels.paymentMethod}</label>
            <select
              name="payment_method"
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{labels.selectPaymentMethod}</option>
              <option value="cash">{labels.paymentCash}</option>
              <option value="bank_transfer">{labels.paymentBank}</option>
              <option value="digital_card">{labels.paymentDigital}</option>
              <option value="credit_card">{labels.paymentCredit}</option>
            </select>
          </div>

          {!showBankLink ? (
            <input type="hidden" name="linked_transaction_id" value={initial?.linked_transaction_id ?? ""} />
          ) : null}
          {showBankLink && children ? (
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400">{labels.linkBankOptional}</label>
              <div className="mt-1">{children}</div>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">{labels.notes}</label>
            <textarea
              name="notes"
              defaultValue={initial?.notes ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          {formExtraContent ? <div className="md:col-span-2">{formExtraContent}</div> : null}

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {labels.save}
            </button>
            <a href={closeHref} className="text-sm text-slate-300 hover:text-slate-100">
              {labels.cancel}
            </a>
          </div>
        </form>
        {extraContent ? <div className="mt-4">{extraContent}</div> : null}
      </div>
    </div>
  );
}
