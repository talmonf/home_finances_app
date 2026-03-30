"use client";

import { DonationKind } from "@/generated/prisma/enums";
import { useState } from "react";

type PayeeOption = { id: string; name: string };

type DonationFormInitialValues = {
  kind: string;
  one_time_amount?: string | null;
  donation_date?: string | null;
  monthly_amount?: string | null;
  commitment_months?: number | null;
  commitment_start_date?: string | null;
  organization_name: string;
  organization_tax_number?: string | null;
  provides_seif_46_receipts?: boolean;
  organization_phone?: string | null;
  organization_email?: string | null;
  currency?: string | null;
  payee_id?: string | null;
  renewal_date?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

export function DonationForm({
  action,
  payees,
  donationId,
  initial,
}: {
  action: (formData: FormData) => void | Promise<void>;
  payees: PayeeOption[];
  donationId?: string;
  initial?: DonationFormInitialValues;
}) {
  const initialKind = initial?.kind ?? DonationKind.one_time;
  const [kind, setKind] = useState<string>(initialKind);
  const initialStatus = initial?.is_active === false ? "historic" : "active";
  const [status, setStatus] = useState<"active" | "historic">(initialStatus);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:grid-cols-2"
    >
      {donationId ? <input type="hidden" name="id" value={donationId} /> : null}

      <div className="lg:col-span-2">
        <label htmlFor="kind" className="mb-1 block text-xs font-medium text-slate-400">
          Donation type
        </label>
        <select
          id="kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          required
          className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value={DonationKind.one_time}>One-time donation</option>
          <option value={DonationKind.monthly_commitment}>Monthly commitment</option>
        </select>
      </div>

      {kind === DonationKind.one_time ? (
        <>
          <div>
            <label htmlFor="one_time_amount" className="mb-1 block text-xs font-medium text-slate-400">
              Amount
            </label>
            <input
              id="one_time_amount"
              name="one_time_amount"
              type="text"
              inputMode="decimal"
              required
              defaultValue={initial?.one_time_amount ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="donation_date" className="mb-1 block text-xs font-medium text-slate-400">
              Donation date
            </label>
            <input
              id="donation_date"
              name="donation_date"
              type="date"
              required
              defaultValue={initial?.donation_date ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="monthly_amount" className="mb-1 block text-xs font-medium text-slate-400">
              Monthly amount
            </label>
            <input
              id="monthly_amount"
              name="monthly_amount"
              type="text"
              inputMode="decimal"
              required
              defaultValue={initial?.monthly_amount ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="commitment_months" className="mb-1 block text-xs font-medium text-slate-400">
              Months committed
            </label>
            <input
              id="commitment_months"
              name="commitment_months"
              type="number"
              min={1}
              step={1}
              required
              defaultValue={initial?.commitment_months ?? undefined}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="12"
            />
          </div>
          <div className="lg:col-span-2">
            <label
              htmlFor="commitment_start_date"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Commitment start date (optional)
            </label>
            <input
              id="commitment_start_date"
              name="commitment_start_date"
              type="date"
              defaultValue={initial?.commitment_start_date ?? ""}
              className="w-full max-w-xs rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </>
      )}

      <div className="lg:col-span-2 border-t border-slate-700/80 pt-4">
        <h3 className="mb-3 text-sm font-medium text-slate-300">Organization</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="organization_name" className="mb-1 block text-xs font-medium text-slate-400">
              Name
            </label>
            <input
              id="organization_name"
              name="organization_name"
              type="text"
              required
              defaultValue={initial?.organization_name ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="organization_tax_number"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Tax registration no. (ח.פ. / עמותה)
            </label>
            <input
              id="organization_tax_number"
              name="organization_tax_number"
              type="text"
              defaultValue={initial?.organization_tax_number ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="provides_seif_46_receipts"
                defaultChecked={initial?.provides_seif_46_receipts ?? false}
                className="rounded border-slate-600 bg-slate-800 text-sky-500"
              />
              Provides tax-deductible receipts (Seif 46)
            </label>
          </div>
          <div>
            <label htmlFor="organization_phone" className="mb-1 block text-xs font-medium text-slate-400">
              Telephone
            </label>
            <input
              id="organization_phone"
              name="organization_phone"
              type="tel"
              defaultValue={initial?.organization_phone ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="organization_email" className="mb-1 block text-xs font-medium text-slate-400">
              Email
            </label>
            <input
              id="organization_email"
              name="organization_email"
              type="email"
              defaultValue={initial?.organization_email ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="currency" className="mb-1 block text-xs font-medium text-slate-400">
          Currency
        </label>
        <select
          id="currency"
          name="currency"
          defaultValue={initial?.currency ?? "ILS"}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="ILS">ILS</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
      <div>
        <label htmlFor="payee_id" className="mb-1 block text-xs font-medium text-slate-400">
          Link to payee (optional)
        </label>
        <select
          id="payee_id"
          name="payee_id"
          defaultValue={initial?.payee_id ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">—</option>
          {payees.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-400">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "active" | "historic")}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="active">Active</option>
          <option value="historic">Historic</option>
        </select>
      </div>
      <div>
        <label htmlFor="renewal_date" className="mb-1 block text-xs font-medium text-slate-400">
          Next renewal / reminder (optional)
        </label>
        <input
          id="renewal_date"
          name="renewal_date"
          type="date"
          defaultValue={initial?.renewal_date ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
        <p className="mt-1 text-xs text-slate-500">Shown on Upcoming renewals when set.</p>
      </div>
      <div className="lg:col-span-2">
        <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
          Notes (optional)
        </label>
        <input
          id="notes"
          name="notes"
          defaultValue={initial?.notes ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>
      <div className="flex items-end lg:col-span-2">
        <button
          type="submit"
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
        >
          Save donation
        </button>
      </div>
    </form>
  );
}
