"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HouseholdDateField } from "@/components/household-date-field";

type PaymentMethod = "bank_transfer" | "digital_payment" | "cash" | "";

type ClientPaymentDefault = {
  default_payment_method?: PaymentMethod | null;
};

type Props = {
  organizationPaidJobIds: string[];
  mode?: "create" | "edit";
  initial?: {
    payment_date?: string;
    payment_method?: PaymentMethod;
    payment_bank_account_id?: string;
    payment_digital_payment_method_id?: string;
  };
  clientPaymentDefaults?: Record<string, ClientPaymentDefault>;
  labels: {
    paymentFieldsHint: string;
    paymentDate: string;
    paymentMethod: string;
    paymentMethodUnset: string;
    paymentBankTransfer: string;
    paymentDigital: string;
    paymentCash: string;
    paymentIntoAccount: string;
    paymentDigitalApp: string;
  };
  bankAccounts: { id: string; label: string }[];
  digitalPaymentMethods: { id: string; name: string }[];
};

export function TreatmentPaymentFieldsSection({
  organizationPaidJobIds,
  mode = "create",
  initial,
  clientPaymentDefaults = {},
  labels,
  bankAccounts,
  digitalPaymentMethods,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [jobId, setJobId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.payment_method ?? "");
  const controlClass =
    "mt-1 w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500";

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const jobInput = form.querySelector('select[name="job_id"]') as HTMLSelectElement | null;
    if (!jobInput) return;

    const syncJob = () => setJobId(jobInput.value || "");
    syncJob();
    jobInput.addEventListener("change", syncJob);
    return () => {
      jobInput.removeEventListener("change", syncJob);
    };
  }, []);

  useEffect(() => {
    if (mode !== "create") return;
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const clientInput = form.querySelector('select[name="client_id"]') as HTMLSelectElement | null;
    if (!clientInput) return;

    const applyClientDefault = () => {
      const defaults = clientPaymentDefaults[clientInput.value];
      if (defaults?.default_payment_method) {
        setPaymentMethod(defaults.default_payment_method);
      }
    };
    applyClientDefault();
    clientInput.addEventListener("change", applyClientDefault);
    return () => clientInput.removeEventListener("change", applyClientDefault);
  }, [clientPaymentDefaults, mode]);

  const isOrganizationPaidJob = useMemo(() => organizationPaidJobIds.includes(jobId), [organizationPaidJobIds, jobId]);

  return (
    <div ref={rootRef} className="md:col-span-2">
      {isOrganizationPaidJob ? (
        <>
          <input type="hidden" name="payment_date" value="" />
          <input type="hidden" name="payment_method" value="" />
          <input type="hidden" name="payment_bank_account_id" value="" />
          <input type="hidden" name="payment_digital_payment_method_id" value="" />
        </>
      ) : (
        <div className="space-y-2 rounded-lg border border-slate-600/90 bg-slate-800/70 p-3 ring-1 ring-slate-600/40">
          <p className="text-xs text-slate-500">{labels.paymentFieldsHint}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-400">{labels.paymentDate}</label>
              <div className="mt-1">
                <HouseholdDateField
                  name="payment_date"
                  defaultIsoYmd={initial?.payment_date ?? ""}
                  className="w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400">{labels.paymentMethod}</label>
              <select
                name="payment_method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className={controlClass}
              >
                <option value="">{labels.paymentMethodUnset}</option>
                <option value="bank_transfer">{labels.paymentBankTransfer}</option>
                <option value="digital_payment">{labels.paymentDigital}</option>
                <option value="cash">{labels.paymentCash}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400">{labels.paymentIntoAccount}</label>
              <select
                name="payment_bank_account_id"
                defaultValue={initial?.payment_bank_account_id ?? ""}
                className={controlClass}
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
              <label className="block text-xs text-slate-400">{labels.paymentDigitalApp}</label>
              <select
                name="payment_digital_payment_method_id"
                defaultValue={initial?.payment_digital_payment_method_id ?? ""}
                className={controlClass}
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
      )}
    </div>
  );
}
