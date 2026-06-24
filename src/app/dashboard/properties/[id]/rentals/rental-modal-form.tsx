import { createRental } from "../../actions";
import { RENTAL_PAYMENT_METHODS, RENTAL_TYPES } from "./rental-form-constants";

type BankAccountOption = { id: string; account_name: string };
type CreditCardOption = { id: string; card_name: string; card_last_four: string };

type RentalModalFormProps = {
  propertyId: string;
  bankAccounts: BankAccountOption[];
  creditCards: CreditCardOption[];
  closeHref: string;
  redirectOnError: string;
};

export function RentalModalForm({
  propertyId,
  bankAccounts,
  creditCards,
  closeHref,
  redirectOnError,
}: RentalModalFormProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
      <div className="max-h-[92vh] w-full max-w-screen-2xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-100">Add rental</h2>
          <a href={closeHref} className="text-sm text-sky-400 hover:text-sky-300">
            Cancel
          </a>
        </div>
        <form
          action={createRental}
          className="grid gap-3 rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="property_id" value={propertyId} />
          <input type="hidden" name="redirect_on_error" value={redirectOnError} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Rental type</label>
            <select
              name="rental_type"
              defaultValue="lease_monthly"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {Object.entries(RENTAL_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Monthly rent (lease)</label>
            <input
              name="monthly_payment"
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Total for stay (short stay)</label>
            <input
              name="period_total_payment"
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Currency</label>
            <input
              name="currency"
              defaultValue="ILS"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Start date</label>
            <input
              name="start_date"
              type="date"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">End date</label>
            <input
              name="end_date"
              type="date"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Payment method</label>
            <select
              name="payment_method"
              defaultValue=""
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">— None —</option>
              {Object.entries(RENTAL_PAYMENT_METHODS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Bank account</label>
            <select
              name="bank_account_id"
              defaultValue=""
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">— None —</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Credit card</label>
            <select
              name="credit_card_id"
              defaultValue=""
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">— None —</option>
              {creditCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.card_name} · ****{c.card_last_four}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-400">Notes</label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              name="is_clinic_lease"
              id="is_clinic_lease_new"
              className="h-4 w-4 rounded border-slate-600 bg-slate-800"
            />
            <label htmlFor="is_clinic_lease_new" className="text-xs text-slate-300">
              Clinic lease — include end date in Clinic reminders
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
            >
              Add rental
            </button>
            <a href={closeHref} className="text-sm text-slate-300 hover:text-slate-100">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
