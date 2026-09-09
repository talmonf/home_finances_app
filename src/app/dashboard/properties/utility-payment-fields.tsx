"use client";

import { useState } from "react";

export type UtilityBankAccountOption = {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string | null;
};

export type UtilityCreditCardOption = {
  id: string;
  card_name: string;
  card_last_four: string;
};

export type UtilityPaymentMethodValue = "" | "bank_account" | "credit_card";

type UtilityPaymentFieldsProps = {
  idPrefix?: string;
  defaultPaymentMethod?: UtilityPaymentMethodValue;
  defaultBankAccountId?: string;
  defaultCreditCardId?: string;
  bankAccounts: UtilityBankAccountOption[];
  creditCards: UtilityCreditCardOption[];
  isHebrew?: boolean;
  className?: string;
};

export function UtilityPaymentFields({
  idPrefix = "",
  defaultPaymentMethod = "",
  defaultBankAccountId = "",
  defaultCreditCardId = "",
  bankAccounts,
  creditCards,
  isHebrew = false,
  className,
}: UtilityPaymentFieldsProps) {
  const [method, setMethod] = useState<UtilityPaymentMethodValue>(defaultPaymentMethod);
  const paymentMethodId = `${idPrefix}payment_method`;
  const bankAccountId = `${idPrefix}bank_account_id`;
  const creditCardId = `${idPrefix}credit_card_id`;

  return (
    <div className={className ?? "grid gap-4 sm:col-span-2 sm:grid-cols-3"}>
      <div>
        <label htmlFor={paymentMethodId} className="mb-1 block text-xs font-medium text-slate-400">
          {isHebrew ? "אמצעי תשלום" : "Payment method"}
        </label>
        <select
          id={paymentMethodId}
          name="payment_method"
          value={method}
          onChange={(event) => setMethod(event.target.value as UtilityPaymentMethodValue)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{isHebrew ? "— אין —" : "— None —"}</option>
          <option value="bank_account">{isHebrew ? "בנק" : "Bank"}</option>
          <option value="credit_card">{isHebrew ? "כרטיס אשראי" : "Credit card"}</option>
        </select>
      </div>
      <div>
        <label htmlFor={bankAccountId} className="mb-1 block text-xs font-medium text-slate-400">
          {isHebrew ? "חשבון בנק" : "Bank account"}
        </label>
        <select
          id={bankAccountId}
          name="bank_account_id"
          defaultValue={defaultBankAccountId}
          disabled={method !== "bank_account"}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
        >
          <option value="">{isHebrew ? "— אין —" : "— None —"}</option>
          {bankAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.bank_name} · {account.account_name}
              {account.account_number ? ` (${account.account_number})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={creditCardId} className="mb-1 block text-xs font-medium text-slate-400">
          {isHebrew ? "כרטיס אשראי" : "Credit card"}
        </label>
        <select
          id={creditCardId}
          name="credit_card_id"
          defaultValue={defaultCreditCardId}
          disabled={method !== "credit_card"}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
        >
          <option value="">{isHebrew ? "— אין —" : "— None —"}</option>
          {creditCards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.card_name} · ****{card.card_last_four}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
