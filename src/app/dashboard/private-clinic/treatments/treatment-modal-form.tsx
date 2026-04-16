 "use client";

import { TherapyTreatmentDefaultAmountFields } from "@/components/therapy-treatment-default-amount-fields";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

type JobOption = { id: string; label: string };
type ProgramOption = { id: string; job_id: string; label: string };
type ClientOption = {
  id: string;
  label: string;
  default_job_id: string;
  default_program_id: string | null;
  default_visit_type: "clinic" | "home" | "phone" | "video" | null;
};
type VisitDefaultOption = {
  job_id: string;
  program_id: string | null;
  visit_type: "clinic" | "home" | "phone" | "video";
  amount: string;
  currency: string;
};

type Labels = {
  c: {
    client: string;
    job: string;
    program: string;
    date: string;
    amount: string;
    currency: string;
    select: string;
    save: string;
    cancel: string;
    linkBankOptional: string;
    txNoneLinked: string;
  };
  tr: {
    occurredTimeOptional: string;
    visitType: string;
    saveTreatment: string;
    clinicIncomeLink: string;
    clinicIncomeHint: string;
    paymentFieldsHint: string;
    paymentDate: string;
    paymentMethod: string;
    paymentMethodUnset: string;
    paymentBankTransfer: string;
    paymentDigital: string;
    paymentIntoAccount: string;
    paymentDigitalApp: string;
    inlineReceiptNumber: string;
    inlineReceiptDate: string;
  };
  note1: string;
  note2: string;
  note3: string;
};

export type TreatmentModalInitial = {
  id?: string;
  client_id?: string;
  client_label?: string;
  job_id?: string;
  program_id?: string;
  occurred_date?: string;
  occurred_time?: string;
  amount?: string;
  currency?: string;
  visit_type?: "clinic" | "home" | "phone" | "video";
  linked_transaction_id?: string;
  payment_date?: string;
  payment_method?: "bank_transfer" | "digital_payment" | "";
  payment_bank_account_id?: string;
  payment_digital_payment_method_id?: string;
  note_1?: string;
  note_2?: string;
  note_3?: string;
};

export function TreatmentModalForm({
  action,
  mode,
  title,
  closeHref,
  redirectOnSuccess,
  redirectOnError,
  householdId,
  uiLanguage,
  clients,
  jobs,
  programs,
  visitDefaults,
  bankAccounts,
  digitalPaymentMethods,
  labels,
  initial,
  extraContent,
}: {
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  title: string;
  closeHref: string;
  redirectOnSuccess: string;
  redirectOnError: string;
  householdId: string;
  uiLanguage: "en" | "he";
  clients: ClientOption[];
  jobs: JobOption[];
  programs: ProgramOption[];
  visitDefaults: VisitDefaultOption[];
  bankAccounts: { id: string; label: string }[];
  digitalPaymentMethods: { id: string; name: string }[];
  labels: Labels;
  initial?: TreatmentModalInitial;
  extraContent?: ReactNode;
}) {
  const visitOptions = ["clinic", "home", "phone", "video"] as const;
  const [selectedClientId, setSelectedClientId] = useState(initial?.client_id ?? clients[0]?.id ?? "");
  const selectedClientDefaults = useMemo(
    () => clients.find((cl) => cl.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-100">{title}</h2>
          <a href={closeHref} className="text-sm text-sky-400 hover:text-sky-300">
            {labels.c.cancel}
          </a>
        </div>
        <form action={action} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
          <input type="hidden" name="redirect_on_error" value={redirectOnError} />
          {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

          {mode === "create" ? (
            <div>
              <label className="block text-xs text-slate-400">{labels.c.client}</label>
              <select
                name="client_id"
                required
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{labels.c.select}</option>
                {clients.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs text-slate-400">{labels.c.client}</label>
              <div className="mt-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                {initial?.client_label || "—"}
              </div>
            </div>
          )}
          <TherapyTreatmentDefaultAmountFields
            key={`${mode}-${selectedClientDefaults?.id ?? "none"}`}
            uiLanguage={uiLanguage}
            jobs={jobs.map((j) => ({ id: j.id, job_title: j.label }))}
            programs={programs.map((p) => ({
              id: p.id,
              job_id: p.job_id,
              name: p.label,
              job: { job_title: jobs.find((j) => j.id === p.job_id)?.label ?? "" },
            }))}
            visitDefaults={visitDefaults}
            clients={clients}
            defaultClientId={selectedClientDefaults?.id ?? ""}
            labels={{
              job: labels.c.job,
              program: labels.c.program,
              date: labels.c.date,
              timeOptional: labels.tr.occurredTimeOptional,
              amount: labels.c.amount,
              currency: labels.c.currency,
              visitType: labels.tr.visitType,
              select: labels.c.select,
            }}
            defaultValues={{
              job_id: initial?.job_id ?? "",
              program_id: initial?.program_id ?? "",
              occurred_date: initial?.occurred_date ?? "",
              occurred_time: initial?.occurred_time ?? "",
              amount: initial?.amount ?? "",
              currency: initial?.currency ?? "ILS",
              visit_type: initial?.visit_type ?? "clinic",
            }}
          />
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">{labels.c.linkBankOptional}</label>
            <TherapyTransactionLinkSelect
              name="linked_transaction_id"
              householdId={householdId}
              currentId={initial?.linked_transaction_id ?? null}
              label={labels.tr.clinicIncomeLink}
              hint={labels.tr.clinicIncomeHint}
              noneOptionLabel={labels.c.txNoneLinked}
            />
          </div>
          <div className="md:col-span-2 space-y-2 rounded-lg border border-slate-700/80 bg-slate-800/40 p-3">
            <p className="text-xs text-slate-500">{labels.tr.paymentFieldsHint}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400">{labels.tr.paymentDate}</label>
                <input
                  name="payment_date"
                  type="date"
                  defaultValue={initial?.payment_date ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400">{labels.tr.paymentMethod}</label>
                <select
                  name="payment_method"
                  defaultValue={initial?.payment_method ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">{labels.tr.paymentMethodUnset}</option>
                  <option value="bank_transfer">{labels.tr.paymentBankTransfer}</option>
                  <option value="digital_payment">{labels.tr.paymentDigital}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400">{labels.tr.paymentIntoAccount}</label>
                <select
                  name="payment_bank_account_id"
                  defaultValue={initial?.payment_bank_account_id ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">—</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400">{labels.tr.paymentDigitalApp}</label>
                <select
                  name="payment_digital_payment_method_id"
                  defaultValue={initial?.payment_digital_payment_method_id ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">—</option>
                  {digitalPaymentMethods.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {mode === "create" ? (
            <div className="md:col-span-2 grid gap-3 rounded-lg border border-slate-700/80 bg-slate-800/40 p-3 md:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400">{labels.tr.inlineReceiptNumber}</label>
                <input
                  name="receipt_number"
                  defaultValue=""
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400">{labels.tr.inlineReceiptDate}</label>
                <input
                  name="receipt_issued_at"
                  type="date"
                  defaultValue={initial?.payment_date ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
          ) : null}
          <textarea
            name="note_1"
            defaultValue={initial?.note_1 ?? ""}
            placeholder={labels.note1}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <textarea
            name="note_2"
            defaultValue={initial?.note_2 ?? ""}
            placeholder={labels.note2}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <textarea
            name="note_3"
            defaultValue={initial?.note_3 ?? ""}
            placeholder={labels.note3}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {labels.tr.saveTreatment}
            </button>
            <a href={closeHref} className="text-sm text-slate-300 hover:text-slate-100">
              {labels.c.cancel}
            </a>
          </div>
          {mode === "edit" ? (
            <div className="md:col-span-2 rounded border border-slate-700/80 bg-slate-800/60 px-3 py-2 text-xs text-slate-400">
              {visitOptions.map((v) => therapyVisitTypeLabel(uiLanguage, v)).join(" · ")}
            </div>
          ) : null}
        </form>
        {extraContent ? <div className="mt-4">{extraContent}</div> : null}
      </div>
    </div>
  );
}
