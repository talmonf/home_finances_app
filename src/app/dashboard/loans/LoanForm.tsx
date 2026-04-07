"use client";

import { useState } from "react";

type LoanFormInitialValues = {
  loan_date?: string | null;
  loan_amount?: string | null;
  currency?: string | null;
  institution_name?: string | null;
  loan_number?: string | null;
  interest_rate_mode?: "none" | "fixed" | "indexed";
  interest_rate_percent?: string | null;
  interest_rate_linked_index?: string | null;
  interest_rate_index_delta_percent?: string | null;
  monthly_repayment_amount?: string | null;
  repayment_day_of_month?: number | null;
  maturity_date?: string | null;
  total_repayment_amount?: string | null;
  purpose?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

export function LoanForm({
  action,
  loanId,
  initial,
}: {
  action: (formData: FormData) => void | Promise<void>;
  loanId?: string;
  initial?: LoanFormInitialValues;
}) {
  const initialStatus = initial?.is_active === false ? "historic" : "active";
  const [status, setStatus] = useState<"active" | "historic">(initialStatus);
  const [interestRateMode, setInterestRateMode] = useState<"none" | "fixed" | "indexed">(
    initial?.interest_rate_mode ?? "none",
  );

  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:grid-cols-2"
    >
      {loanId ? <input type="hidden" name="id" value={loanId} /> : null}

      <div>
        <label htmlFor="loan_date" className="mb-1 block text-xs font-medium text-slate-400">
          Loan date
        </label>
        <input
          id="loan_date"
          name="loan_date"
          type="date"
          required
          defaultValue={initial?.loan_date ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <div>
        <label htmlFor="institution_name" className="mb-1 block text-xs font-medium text-slate-400">
          Loan institution
        </label>
        <input
          id="institution_name"
          name="institution_name"
          type="text"
          required
          defaultValue={initial?.institution_name ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <div>
        <label htmlFor="loan_number" className="mb-1 block text-xs font-medium text-slate-400">
          Loan #
        </label>
        <input
          id="loan_number"
          name="loan_number"
          type="text"
          defaultValue={initial?.loan_number ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <div>
        <label htmlFor="interest_rate_mode" className="mb-1 block text-xs font-medium text-slate-400">
          Interest type
        </label>
        <select
          id="interest_rate_mode"
          name="interest_rate_mode"
          value={interestRateMode}
          onChange={(e) => setInterestRateMode(e.target.value as "none" | "fixed" | "indexed")}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="none">Not specified</option>
          <option value="fixed">Fixed %</option>
          <option value="indexed">Linked to index + delta</option>
        </select>
      </div>

      {interestRateMode === "fixed" && (
        <div>
          <label htmlFor="interest_rate_percent" className="mb-1 block text-xs font-medium text-slate-400">
            Interest rate (%)
          </label>
          <input
            id="interest_rate_percent"
            name="interest_rate_percent"
            type="text"
            inputMode="decimal"
            required
            defaultValue={initial?.interest_rate_percent ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            placeholder="4.50"
          />
        </div>
      )}

      {interestRateMode === "indexed" && (
        <>
          <div>
            <label htmlFor="interest_rate_linked_index" className="mb-1 block text-xs font-medium text-slate-400">
              Linked index
            </label>
            <input
              id="interest_rate_linked_index"
              name="interest_rate_linked_index"
              type="text"
              required
              defaultValue={initial?.interest_rate_linked_index ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="Prime"
            />
          </div>
          <div>
            <label
              htmlFor="interest_rate_index_delta_percent"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Delta (%)
            </label>
            <input
              id="interest_rate_index_delta_percent"
              name="interest_rate_index_delta_percent"
              type="text"
              inputMode="decimal"
              required
              defaultValue={initial?.interest_rate_index_delta_percent ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="-1.00"
            />
          </div>
        </>
      )}

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
        <label htmlFor="loan_amount" className="mb-1 block text-xs font-medium text-slate-400">
          Loan amount
        </label>
        <input
          id="loan_amount"
          name="loan_amount"
          type="text"
          inputMode="decimal"
          required
          defaultValue={initial?.loan_amount ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          placeholder="0.00"
        />
      </div>

      <div>
        <label htmlFor="monthly_repayment_amount" className="mb-1 block text-xs font-medium text-slate-400">
          Monthly repayment amount
        </label>
        <input
          id="monthly_repayment_amount"
          name="monthly_repayment_amount"
          type="text"
          inputMode="decimal"
          defaultValue={initial?.monthly_repayment_amount ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          placeholder="0.00"
        />
      </div>

      <div>
        <label htmlFor="repayment_day_of_month" className="mb-1 block text-xs font-medium text-slate-400">
          Repayment day of month (1–31)
        </label>
        <input
          id="repayment_day_of_month"
          name="repayment_day_of_month"
          type="number"
          min={1}
          max={31}
          defaultValue={initial?.repayment_day_of_month ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <div>
        <label htmlFor="maturity_date" className="mb-1 block text-xs font-medium text-slate-400">
          Final payoff date (maturity)
        </label>
        <input
          id="maturity_date"
          name="maturity_date"
          type="date"
          defaultValue={initial?.maturity_date ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <div>
        <label htmlFor="total_repayment_amount" className="mb-1 block text-xs font-medium text-slate-400">
          Total repayment amount
        </label>
        <input
          id="total_repayment_amount"
          name="total_repayment_amount"
          type="text"
          inputMode="decimal"
          defaultValue={initial?.total_repayment_amount ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          placeholder="0.00"
        />
      </div>

      <div className="lg:col-span-2">
        <label htmlFor="purpose" className="mb-1 block text-xs font-medium text-slate-400">
          Loan purpose
        </label>
        <textarea
          id="purpose"
          name="purpose"
          rows={2}
          defaultValue={initial?.purpose ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <div className="lg:col-span-2">
        <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ""}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
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
          className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="active">Active</option>
          <option value="historic">Paid off / historic</option>
        </select>
      </div>

      <div className="flex items-end lg:col-span-2">
        <button
          type="submit"
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
        >
          {loanId ? "Save changes" : "Add loan"}
        </button>
      </div>
    </form>
  );
}
