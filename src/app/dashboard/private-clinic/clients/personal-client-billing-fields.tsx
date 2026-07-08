"use client";

import { useEffect, useState } from "react";

type Labels = {
  agreedFeeOptional: string;
  agreedFeeCurrency: string;
  defaultPaymentMethodOptional: string;
  personalClientBillingHint: string;
  paymentMethodUnset: string;
  paymentBankTransfer: string;
  paymentDigital: string;
  paymentCash: string;
};

export function PersonalClientBillingFields({
  familiesEnabled,
  familySelectId,
  initialFamilyId,
  initialAgreedFeeAmount,
  initialAgreedFeeCurrency,
  initialDefaultPaymentMethod,
  labels,
}: {
  familiesEnabled: boolean;
  familySelectId?: string;
  initialFamilyId?: string | null;
  initialAgreedFeeAmount?: string | null;
  initialAgreedFeeCurrency?: string | null;
  initialDefaultPaymentMethod?: "bank_transfer" | "digital_payment" | "cash" | null;
  labels: Labels;
}) {
  const [isPersonal, setIsPersonal] = useState(!initialFamilyId);

  useEffect(() => {
    if (!familiesEnabled) {
      setIsPersonal(true);
      return;
    }
    const familySelect = familySelectId
      ? (document.getElementById(familySelectId) as HTMLSelectElement | null)
      : null;
    if (!familySelect) {
      setIsPersonal(!initialFamilyId);
      return;
    }
    const sync = () => setIsPersonal(!familySelect.value);
    sync();
    familySelect.addEventListener("change", sync);
    return () => familySelect.removeEventListener("change", sync);
  }, [familiesEnabled, familySelectId, initialFamilyId]);

  if (!isPersonal) return null;

  const controlClass =
    "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100";

  return (
    <>
      <p className="text-xs text-slate-500 md:col-span-2">{labels.personalClientBillingHint}</p>
      <div className="space-y-1">
        <label className="block text-xs text-slate-400">{labels.agreedFeeOptional}</label>
        <input
          name="agreed_fee_amount"
          type="text"
          inputMode="decimal"
          defaultValue={initialAgreedFeeAmount ?? ""}
          placeholder="0.00"
          className={controlClass}
        />
      </div>
      <div className="space-y-1">
        <label className="block text-xs text-slate-400">{labels.agreedFeeCurrency}</label>
        <input
          name="agreed_fee_currency"
          type="text"
          defaultValue={initialAgreedFeeCurrency ?? "ILS"}
          className={controlClass}
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <label className="block text-xs text-slate-400">{labels.defaultPaymentMethodOptional}</label>
        <select
          name="default_payment_method"
          defaultValue={initialDefaultPaymentMethod ?? ""}
          className={controlClass}
        >
          <option value="">{labels.paymentMethodUnset}</option>
          <option value="bank_transfer">{labels.paymentBankTransfer}</option>
          <option value="digital_payment">{labels.paymentDigital}</option>
          <option value="cash">{labels.paymentCash}</option>
        </select>
      </div>
    </>
  );
}
