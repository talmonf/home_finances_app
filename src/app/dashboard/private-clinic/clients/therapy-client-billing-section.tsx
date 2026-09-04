"use client";

import { useEffect, useState } from "react";
import { defaultClinicJobId } from "@/lib/private-clinic/default-clinic-job-id";
import { PersonalClientBillingFields } from "./personal-client-billing-fields";
import type { TherapyClientFamilyOption, TherapyClientFormJobOption } from "./load-therapy-client-form-options";

function jobIsCompanyPaid(job: TherapyClientFormJobOption | undefined): boolean {
  if (!job) return false;
  if (job.employmentType === "employee" || job.employmentType === "contractor_via_company") return true;
  return job.hasEmployer;
}

type BillingLabels = {
  sectionTitle: string;
  none: string;
  agreedFeeOptional: string;
  agreedFeeCurrency: string;
  defaultPaymentMethodOptional: string;
  personalClientBillingHint: string;
  paymentMethodUnset: string;
  paymentBankTransfer: string;
  paymentDigital: string;
  paymentCash: string;
};

export function TherapyClientBillingSection({
  jobs,
  families,
  defaultJobId,
  familySelectId,
  initialFamilyId,
  initialBillingBasis,
  initialBillingTiming,
  initialAgreedFeeAmount,
  initialAgreedFeeCurrency,
  initialDefaultPaymentMethod,
  labels,
}: {
  jobs: TherapyClientFormJobOption[];
  families: TherapyClientFamilyOption[];
  defaultJobId?: string | null;
  familySelectId: string;
  initialFamilyId?: string | null;
  initialBillingBasis?: "per_treatment" | "per_month" | null;
  initialBillingTiming?: "in_advance" | "in_arrears" | null;
  initialAgreedFeeAmount?: string | null;
  initialAgreedFeeCurrency?: string | null;
  initialDefaultPaymentMethod?: "bank_transfer" | "digital_payment" | "cash" | null;
  labels: BillingLabels;
}) {
  const initialJobId = defaultClinicJobId(jobs, defaultJobId);
  const [billsClient, setBillsClient] = useState(() => {
    const job = jobs.find((j) => j.id === initialJobId);
    return !jobIsCompanyPaid(job);
  });

  useEffect(() => {
    const select = document.querySelector('select[name="default_job_id"]') as HTMLSelectElement | null;
    if (!select) {
      const job = jobs.find((j) => j.id === initialJobId);
      setBillsClient(!jobIsCompanyPaid(job));
      return;
    }
    const sync = () => {
      const job = jobs.find((j) => j.id === select.value);
      setBillsClient(!jobIsCompanyPaid(job));
    };
    sync();
    select.addEventListener("change", sync);
    return () => select.removeEventListener("change", sync);
  }, [jobs, initialJobId]);

  const hiddenFields = (
    <>
      <input type="hidden" name="billing_basis" value={initialBillingBasis ?? ""} />
      <input type="hidden" name="billing_timing" value={initialBillingTiming ?? ""} />
      {families.length > 0 ? <input type="hidden" name="family_id" value={initialFamilyId ?? ""} /> : null}
      <input type="hidden" name="agreed_fee_amount" value={initialAgreedFeeAmount ?? ""} />
      <input type="hidden" name="agreed_fee_currency" value={initialAgreedFeeCurrency ?? "ILS"} />
      <input type="hidden" name="default_payment_method" value={initialDefaultPaymentMethod ?? ""} />
    </>
  );

  if (!billsClient) {
    return <div className="hidden">{hiddenFields}</div>;
  }

  const controlClass =
    "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100";

  return (
    <details className="md:col-span-2 rounded-lg border border-slate-800 bg-slate-950/30">
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-200">
        {labels.sectionTitle}
      </summary>
      <div className="grid items-start gap-3 border-t border-slate-800 p-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Billing basis</label>
          <select name="billing_basis" defaultValue={initialBillingBasis ?? ""} className={controlClass}>
            <option value="">{families.length > 0 ? "Use family setting" : labels.none}</option>
            <option value="per_treatment">Per treatment</option>
            <option value="per_month">Per month</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Billing timing</label>
          <select name="billing_timing" defaultValue={initialBillingTiming ?? ""} className={controlClass}>
            <option value="">{families.length > 0 ? "Use family setting" : labels.none}</option>
            <option value="in_advance">In advance</option>
            <option value="in_arrears">In arrears</option>
          </select>
        </div>
        {families.length > 0 ? (
          <div className="space-y-1 md:col-span-2">
            <label htmlFor={familySelectId} className="block text-xs text-slate-400">
              Family
            </label>
            <select
              id={familySelectId}
              name="family_id"
              defaultValue={initialFamilyId ?? ""}
              className={controlClass}
            >
              <option value="">No family</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <PersonalClientBillingFields
          familiesEnabled={families.length > 0}
          familySelectId={families.length > 0 ? familySelectId : undefined}
          initialFamilyId={initialFamilyId}
          initialAgreedFeeAmount={initialAgreedFeeAmount}
          initialAgreedFeeCurrency={initialAgreedFeeCurrency}
          initialDefaultPaymentMethod={initialDefaultPaymentMethod}
          labels={{
            agreedFeeOptional: labels.agreedFeeOptional,
            agreedFeeCurrency: labels.agreedFeeCurrency,
            defaultPaymentMethodOptional: labels.defaultPaymentMethodOptional,
            personalClientBillingHint: labels.personalClientBillingHint,
            paymentMethodUnset: labels.paymentMethodUnset,
            paymentBankTransfer: labels.paymentBankTransfer,
            paymentDigital: labels.paymentDigital,
            paymentCash: labels.paymentCash,
          }}
        />
      </div>
    </details>
  );
}
