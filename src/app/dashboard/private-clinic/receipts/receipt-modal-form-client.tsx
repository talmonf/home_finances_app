"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type JobOption = { id: string; label: string };

type ClientOption = { id: string; first_name: string; last_name: string | null };

type ProgramOption = { id: string; jobId: string; label: string };

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
  totalAmount: string;
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
  linkBankOptional: string;
};

export type ReceiptModalInitial = {
  id?: string;
  job_id?: string;
  program_id?: string;
  client_id?: string;
  receipt_number?: string;
  issued_at?: string;
  total_amount?: string;
  currency?: string;
  covered_period_start?: string;
  covered_period_end?: string;
  recipient_type?: "client" | "organization" | "";
  payment_method?: "cash" | "bank_transfer" | "digital_card" | "credit_card" | "";
  linked_transaction_id?: string;
  notes?: string;
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
  /** Server-rendered transaction picker (passed from parent Server Component). */
  children: ReactNode;
}) {
  const [jobId, setJobId] = useState(initial?.job_id ?? "");
  const [programId, setProgramId] = useState(initial?.program_id ?? "");
  const [recipientType, setRecipientType] = useState<string>(initial?.recipient_type ?? "");
  const [paymentMethod, setPaymentMethod] = useState<string>(initial?.payment_method ?? "");
  const [clientId, setClientId] = useState(initial?.client_id ?? "");

  useEffect(() => {
    setJobId(initial?.job_id ?? "");
    setProgramId(initial?.program_id ?? "");
    setRecipientType(initial?.recipient_type ?? "");
    setPaymentMethod(initial?.payment_method ?? "");
    setClientId(initial?.client_id ?? "");
  }, [initial]);

  const programsForJob = useMemo(
    () => (jobId ? programs.filter((p) => p.jobId === jobId) : []),
    [programs, jobId],
  );

  useEffect(() => {
    if (programId && !programsForJob.some((p) => p.id === programId)) {
      setProgramId("");
    }
  }, [programsForJob, programId]);

  useEffect(() => {
    if (recipientType === "organization") {
      setClientId("");
    }
  }, [recipientType]);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-100">{mode === "create" ? labels.titleNew : labels.titleEdit}</h2>
          <a href={closeHref} className="text-sm text-sky-400 hover:text-sky-300">
            {labels.cancel}
          </a>
        </div>
        <form action={action} className="grid gap-3 md:grid-cols-2">
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
              }}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{labels.job}</option>
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
              <option value="">{labels.programOptionalEmpty}</option>
              {programsForJob.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.receiptNumber}</label>
            <input
              name="receipt_number"
              required
              defaultValue={initial?.receipt_number ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.date}</label>
            <input
              name="issued_at"
              type="date"
              required
              defaultValue={initial?.issued_at ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.totalAmount}</label>
            <input
              name="total_amount"
              required
              defaultValue={initial?.total_amount ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.currency}</label>
            <input
              name="currency"
              defaultValue={initial?.currency ?? "ILS"}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.coveredStart}</label>
            <input
              name="covered_period_start"
              type="date"
              defaultValue={initial?.covered_period_start ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.coveredEnd}</label>
            <input
              name="covered_period_end"
              type="date"
              defaultValue={initial?.covered_period_end ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{labels.recipient}</label>
            <select
              name="recipient_type"
              required
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{labels.selectRecipient}</option>
              <option value="client">{labels.recipientClient}</option>
              <option value="organization">{labels.recipientOrg}</option>
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
                {clients.map((cl) => (
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

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">{labels.linkBankOptional}</label>
            <div className="mt-1">{children}</div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">{labels.notes}</label>
            <textarea
              name="notes"
              defaultValue={initial?.notes ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {labels.save}
            </button>
            <a href={closeHref} className="text-sm text-slate-300 hover:text-slate-100">
              {labels.cancel}
            </a>
          </div>
          {extraContent ? <div className="md:col-span-2">{extraContent}</div> : null}
        </form>
      </div>
    </div>
  );
}
