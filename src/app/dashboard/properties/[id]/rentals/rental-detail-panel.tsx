import { ConfirmDeleteForm, ConfirmDeleteFormActionButton } from "@/components/confirm-delete";
import { DirectFileOpenDownloadLinks } from "@/components/file-open-download-links";
import { formatHouseholdDate, type HouseholdDateDisplayFormat } from "@/lib/household-date-format";
import { formatRentalTypeLabel } from "@/lib/rental-labels";
import RentalContractUpload from "../RentalContractUpload";
import {
  updateRental,
  deleteRental,
  createRentalTenant,
  updateRentalTenant,
  deleteRentalTenant,
  createRentalUtility,
  updateRentalUtility,
  deleteRentalUtility,
  deleteRentalContract,
} from "../../actions";
import { RentalUtilityAddRow } from "./rental-utility-add-row";
import { RENTAL_PAYMENT_METHODS, RENTAL_TYPES } from "./rental-form-constants";

type BankAccountOption = { id: string; account_name: string };
type CreditCardOption = { id: string; card_name: string; card_last_four: string };

type RentalTenant = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

type RentalUtility = {
  id: string;
  utility_type: string;
  utility_company: string;
  account_number: string | null;
  meter_number: string | null;
  last_meter_reading: string | null;
  notes: string | null;
};

type PropertyUtilityDefault = {
  id: string;
  utility_type: string;
  provider_name: string;
  account_number: string | null;
  meter_number: string | null;
  notes: string | null;
};

type RentalContract = {
  id: string;
  file_name: string;
  storage_url: string | null;
};

type RentalTransaction = {
  id: string;
  transaction_date: Date;
  amount: { toString(): string };
  description: string | null;
};

type UnlinkedTransaction = {
  id: string;
  transaction_date: Date;
  amount: { toString(): string };
  description: string | null;
  rental_id: string | null;
};

export type RentalDetail = {
  id: string;
  rental_type: string;
  start_date: Date | null;
  end_date: Date | null;
  monthly_payment: { toString(): string } | null;
  period_total_payment: { toString(): string } | null;
  currency: string;
  payment_method: string | null;
  bank_account_id: string | null;
  credit_card_id: string | null;
  notes: string | null;
  is_clinic_lease: boolean;
  tenants: RentalTenant[];
  utilities: RentalUtility[];
  contracts: RentalContract[];
  transactions: RentalTransaction[];
};

type RentalDetailPanelProps = {
  rental: RentalDetail;
  propertyId: string;
  propertyUtilities: PropertyUtilityDefault[];
  bankAccounts: BankAccountOption[];
  creditCards: CreditCardOption[];
  transactions: UnlinkedTransaction[];
  dateDisplayFormat: HouseholdDateDisplayFormat;
};

const UTILITY_TYPE_LABELS: Record<string, string> = {
  electricity: "Electricity",
  water: "Water",
  internet: "Internet",
  telephone: "Telephone",
  gas: "Gas",
  arnona: "Arnona",
  other: "Other",
};

function formatDateRangeSummary(
  rental: RentalDetail,
  dateDisplayFormat: HouseholdDateDisplayFormat,
): string {
  const start = rental.start_date
    ? formatHouseholdDate(rental.start_date, dateDisplayFormat)
    : "No start date";
  const end = rental.end_date
    ? formatHouseholdDate(rental.end_date, dateDisplayFormat)
    : "No end date";
  return `${start} → ${end}`;
}

export function RentalDetailPanel({
  rental,
  propertyId,
  propertyUtilities,
  bankAccounts,
  creditCards,
  transactions,
  dateDisplayFormat,
}: RentalDetailPanelProps) {
  return (
    <section className="space-y-6 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
      <div>
        <h2 className="text-lg font-medium text-slate-200">Rental details</h2>
        <p className="mt-1 text-sm text-slate-400">
          {formatRentalTypeLabel(rental.rental_type)} · {formatDateRangeSummary(rental, dateDisplayFormat)}
        </p>
      </div>

      <form action={updateRental} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="id" value={rental.id} />
        <input type="hidden" name="property_id" value={propertyId} />
        <div>
          <label className="mb-1 block text-xs text-slate-400">Rental type</label>
          <select
            name="rental_type"
            defaultValue={rental.rental_type}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
          >
            {Object.entries(RENTAL_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Monthly payment</label>
          <input
            type="number"
            name="monthly_payment"
            step="0.01"
            min="0"
            defaultValue={rental.monthly_payment?.toString() ?? ""}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Total for stay</label>
          <input
            type="number"
            name="period_total_payment"
            step="0.01"
            min="0"
            defaultValue={rental.period_total_payment?.toString() ?? ""}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Currency</label>
          <input
            name="currency"
            defaultValue={rental.currency}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Start date</label>
          <input
            type="date"
            name="start_date"
            defaultValue={rental.start_date ? rental.start_date.toISOString().slice(0, 10) : ""}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">End date</label>
          <input
            type="date"
            name="end_date"
            defaultValue={rental.end_date ? rental.end_date.toISOString().slice(0, 10) : ""}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Payment method</label>
          <select
            name="payment_method"
            defaultValue={rental.payment_method ?? ""}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
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
          <label className="mb-1 block text-xs text-slate-400">Bank account</label>
          <select
            name="bank_account_id"
            defaultValue={rental.bank_account_id ?? ""}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
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
          <label className="mb-1 block text-xs text-slate-400">Credit card</label>
          <select
            name="credit_card_id"
            defaultValue={rental.credit_card_id ?? ""}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
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
          <label className="mb-1 block text-xs text-slate-400">Notes</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={rental.notes ?? ""}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            name="is_clinic_lease"
            id={`is_clinic_lease_${rental.id}`}
            defaultChecked={rental.is_clinic_lease}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800"
          />
          <label htmlFor={`is_clinic_lease_${rental.id}`} className="text-xs text-slate-300">
            Clinic lease (reminders)
          </label>
        </div>
        <div className="flex items-end gap-3">
          <button type="submit" className="rounded bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-500">
            Save rental
          </button>
          <ConfirmDeleteFormActionButton
            formAction={deleteRental.bind(null, rental.id, propertyId)}
            className="rounded bg-rose-700 px-3 py-1.5 text-xs text-white hover:bg-rose-600"
          >
            Delete rental
          </ConfirmDeleteFormActionButton>
        </div>
      </form>

      <div className="space-y-3 rounded-lg border border-slate-700 p-4">
        <div>
          <h3 className="text-sm font-medium text-slate-200">Tenants</h3>
          <p className="mt-1 text-xs text-slate-500">Who is renting (you can add several).</p>
        </div>
        <form action={createRentalTenant} className="grid gap-2 sm:grid-cols-4">
          <input type="hidden" name="rental_id" value={rental.id} />
          <input
            name="full_name"
            required
            placeholder="Full name"
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          />
          <input
            name="email"
            placeholder="Email"
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          />
          <input
            name="phone"
            placeholder="Phone"
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          />
          <input
            name="notes"
            placeholder="Notes"
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          />
          <button type="submit" className="rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-500">
            Add tenant
          </button>
        </form>
        <div className="space-y-2">
          {rental.tenants.map((tenant) => (
            <form key={tenant.id} action={updateRentalTenant} className="grid gap-2 sm:grid-cols-5">
              <input type="hidden" name="id" value={tenant.id} />
              <input
                name="full_name"
                defaultValue={tenant.full_name}
                required
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
              />
              <input
                name="email"
                defaultValue={tenant.email ?? ""}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
              />
              <input
                name="phone"
                defaultValue={tenant.phone ?? ""}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
              />
              <input
                name="notes"
                defaultValue={tenant.notes ?? ""}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
              />
              <div className="flex items-center gap-2">
                <button type="submit" className="text-xs text-sky-300 hover:text-sky-200">
                  Save
                </button>
                <ConfirmDeleteFormActionButton
                  formAction={deleteRentalTenant.bind(null, tenant.id, propertyId)}
                  className="text-xs text-rose-400 hover:text-rose-300"
                >
                  Delete
                </ConfirmDeleteFormActionButton>
              </div>
            </form>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-700 p-4">
        <div>
          <h3 className="text-sm font-medium text-slate-200">Utilities</h3>
          <p className="mt-1 text-xs text-slate-500">
            Utility details for this rental, including company, account, meter, and latest reading.
          </p>
        </div>
        <form id={`add_rental_utility_${rental.id}`} action={createRentalUtility}>
          <input type="hidden" name="rental_id" value={rental.id} />
        </form>
        {rental.utilities.map((utility) => (
          <form key={`utility_form_${utility.id}`} id={`rental_utility_${utility.id}`} action={updateRentalUtility}>
            <input type="hidden" name="id" value={utility.id} />
          </form>
        ))}
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="min-w-full divide-y divide-slate-700 text-xs">
            <thead className="bg-slate-800/80 text-left text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Utility company</th>
                <th className="px-3 py-2 font-medium">Account #</th>
                <th className="px-3 py-2 font-medium">Meter #</th>
                <th className="px-3 py-2 font-medium">Last meter reading</th>
                <th className="px-3 py-2 font-medium">Notes</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rental.utilities.length > 0 ? (
                rental.utilities.map((utility) => {
                  const formId = `rental_utility_${utility.id}`;
                  return (
                    <tr key={utility.id}>
                      <td className="px-3 py-2">
                        <select
                          form={formId}
                          name="utility_type"
                          defaultValue={utility.utility_type}
                          aria-label="Utility type"
                          className="w-36 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                        >
                          {Object.entries(UTILITY_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          form={formId}
                          name="utility_company"
                          required
                          defaultValue={utility.utility_company}
                          aria-label="Utility company"
                          className="w-40 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          form={formId}
                          name="account_number"
                          defaultValue={utility.account_number ?? ""}
                          aria-label="Account number"
                          className="w-32 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          form={formId}
                          name="meter_number"
                          defaultValue={utility.meter_number ?? ""}
                          aria-label="Meter number"
                          className="w-32 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          form={formId}
                          name="last_meter_reading"
                          defaultValue={utility.last_meter_reading ?? ""}
                          aria-label="Last meter reading"
                          className="w-36 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          form={formId}
                          name="notes"
                          defaultValue={utility.notes ?? ""}
                          aria-label="Utility notes"
                          className="w-40 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            form={formId}
                            className="text-xs text-sky-300 hover:text-sky-200"
                          >
                            Save
                          </button>
                          <ConfirmDeleteForm action={deleteRentalUtility.bind(null, utility.id, propertyId)}>
                            <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                              Delete
                            </button>
                          </ConfirmDeleteForm>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-3 text-slate-500">
                    No utilities recorded for this rental yet.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t border-slate-700 bg-slate-900/70">
              <RentalUtilityAddRow
                formId={`add_rental_utility_${rental.id}`}
                utilityTypeLabels={UTILITY_TYPE_LABELS}
                propertyUtilities={propertyUtilities}
              />
            </tfoot>
          </table>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-700 p-4">
        <h3 className="text-sm font-medium text-slate-200">Contract files</h3>
        <RentalContractUpload rentalId={rental.id} />
        <div className="space-y-1">
          {rental.contracts.map((contract) => (
            <div
              key={contract.id}
              className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300"
            >
              <span className="min-w-0 truncate text-slate-200">{contract.file_name}</span>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {contract.storage_url ? (
                  <DirectFileOpenDownloadLinks href={contract.storage_url} fileName={contract.file_name} />
                ) : null}
                <ConfirmDeleteForm action={deleteRentalContract.bind(null, contract.id, propertyId)}>
                  <button type="submit" className="text-rose-400 hover:text-rose-300">
                    Delete
                  </button>
                </ConfirmDeleteForm>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-700 p-4">
        <h3 className="text-sm font-medium text-slate-200">Linked transactions</h3>
        {rental.transactions.length > 0 ? (
          <ul className="space-y-1 text-xs text-slate-300">
            {rental.transactions.map((tx) => (
              <li key={tx.id}>
                {formatHouseholdDate(new Date(tx.transaction_date), dateDisplayFormat)} · {tx.amount.toString()} ·{" "}
                {tx.description ?? "—"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">No linked transactions yet. Use Import Review to link them.</p>
        )}
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            Recent transactions not linked to this rental
          </label>
          <select className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100">
            <option value="">Use Import Review page for linking</option>
            {transactions
              .filter((t) => t.rental_id !== rental.id)
              .slice(0, 20)
              .map((tx) => (
                <option key={tx.id} value={tx.id}>
                  {formatHouseholdDate(new Date(tx.transaction_date), dateDisplayFormat)} · {tx.amount.toString()} ·{" "}
                  {tx.description ?? "—"}
                </option>
              ))}
          </select>
        </div>
      </div>
    </section>
  );
}
