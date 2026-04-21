"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  organizationPaidJobIds: string[];
  initial?: {
    payment_date?: string;
    payment_method?: "bank_transfer" | "digital_payment" | "";
    payment_bank_account_id?: string;
    payment_digital_payment_method_id?: string;
  };
  labels: {
    paymentFieldsHint: string;
    paymentDate: string;
    paymentMethod: string;
    paymentMethodUnset: string;
    paymentBankTransfer: string;
    paymentDigital: string;
    paymentIntoAccount: string;
    paymentDigitalApp: string;
  };
  bankAccounts: { id: string; label: string }[];
  digitalPaymentMethods: { id: string; name: string }[];
};

export function TreatmentPaymentFieldsSection({
  organizationPaidJobIds,
  initial,
  labels,
  bankAccounts,
  digitalPaymentMethods,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [jobId, setJobId] = useState("");

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const jobInput = form.querySelector('select[name="job_id"]') as HTMLSelectElement | null;
    if (!jobInput) return;

    const sync = () => setJobId(jobInput.value || "");
    sync();
    jobInput.addEventListener("change", sync);
    return () => {
      jobInput.removeEventListener("change", sync);
    };
  }, []);

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
        <div className="space-y-2 rounded-lg border border-slate-700/80 bg-slate-800/40 p-3">
          <p className="text-xs text-slate-500">{labels.paymentFieldsHint}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-400">{labels.paymentDate}</label>
              <input
                name="payment_date"
                type="date"
                defaultValue={initial?.payment_date ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400">{labels.paymentMethod}</label>
              <select
                name="payment_method"
                defaultValue={initial?.payment_method ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{labels.paymentMethodUnset}</option>
                <option value="bank_transfer">{labels.paymentBankTransfer}</option>
                <option value="digital_payment">{labels.paymentDigital}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400">{labels.paymentIntoAccount}</label>
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
              <label className="block text-xs text-slate-400">{labels.paymentDigitalApp}</label>
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
      )}
    </div>
  );
}
