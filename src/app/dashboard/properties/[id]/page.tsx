import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import RentalContractUpload from "./RentalContractUpload";
import {
  updateProperty,
  createUtility,
  deleteUtility,
  createRental,
  updateRental,
  deleteRental,
  createRentalTenant,
  updateRentalTenant,
  deleteRentalTenant,
  deleteRentalContract,
} from "../actions";

export const dynamic = "force-dynamic";

const UTILITY_TYPE_LABELS: Record<string, string> = {
  electricity: "Electricity",
  water: "Water",
  internet: "Internet",
  telephone: "Telephone",
  gas: "Gas",
  other: "Other",
};

const RENTAL_TYPES: Record<string, string> = {
  lease_monthly: "Lease (monthly rent)",
  short_stay: "Short stay (total for period)",
};

const RENTAL_PAYMENT_METHODS: Record<string, string> = {
  cash: "Cash",
  credit_card: "Credit card",
  bank_account: "Bank account",
  other: "Other",
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; updated?: string }>;
};

export default async function PropertyDetailPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [property, payees, bankAccounts, creditCards, transactions] = await Promise.all([
    prisma.properties.findFirst({
      where: { id, household_id: householdId },
      include: {
        utilities: { include: { payee: true } },
        rentals: {
          include: {
            tenants: true,
            contracts: true,
            credit_card: true,
            bank_account: true,
            transactions: { orderBy: { transaction_date: "desc" }, take: 25 },
          },
          orderBy: { created_at: "desc" },
        },
      },
    }),
    prisma.payees.findMany({
      where: { household_id: householdId },
      orderBy: { name: "asc" },
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { account_name: "asc" },
    }),
    prisma.credit_cards.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { card_name: "asc" },
    }),
    prisma.transactions.findMany({
      where: { household_id: householdId, import_status: "confirmed" },
      orderBy: { transaction_date: "desc" },
      take: 300,
      select: { id: true, transaction_date: true, amount: true, description: true, rental_id: true },
    }),
  ]);

  if (!property) redirect("/dashboard/properties?error=Not+found");

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-4xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/properties"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back to homes &amp; properties
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">{property.name}</h1>
          <p className="text-sm text-slate-400">
            Update property details and manage utility companies that service this home.
          </p>
          {(resolvedSearchParams?.error || resolvedSearchParams?.updated) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              {resolvedSearchParams.error
                ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                : resolvedSearchParams.updated === "utility"
                  ? "Utility updated."
                  : "Saved."}
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Property details</h2>
          <form action={updateProperty} className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={property.id} />
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-slate-400">Name</label>
              <input id="name" name="name" required defaultValue={property.name} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label htmlFor="property_type" className="mb-1 block text-xs font-medium text-slate-400">Type</label>
              <select id="property_type" name="property_type" defaultValue={property.property_type ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">—</option>
                <option value="owned">Owned</option>
                <option value="rental">Rental</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="landlord_name" className="mb-1 block text-xs font-medium text-slate-400">In whose name</label>
              <input id="landlord_name" name="landlord_name" defaultValue={property.landlord_name ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="mb-1 block text-xs font-medium text-slate-400">Address</label>
              <textarea id="address" name="address" rows={2} defaultValue={property.address ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="landlord_contact" className="mb-1 block text-xs font-medium text-slate-400">
                Contact details (phone / email)
              </label>
              <textarea
                id="landlord_contact"
                name="landlord_contact"
                rows={2}
                defaultValue={property.landlord_contact ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={property.notes ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Save changes</button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium text-slate-200">Rentals</h2>
            <p className="mt-1 text-sm text-slate-400">
              Add a rental with <strong className="font-medium text-slate-300">Add rental</strong> below. After it appears in the list, open that rental’s card — you’ll find{" "}
              <strong className="font-medium text-slate-300">Tenants</strong> there (name, email, phone, notes). You can add more than one tenant per rental.
            </p>
          </div>
          <form action={createRental} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="property_id" value={property.id} />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Rental type</label>
              <select name="rental_type" defaultValue="lease_monthly" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                {Object.entries(RENTAL_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Monthly rent (lease)</label>
              <input name="monthly_payment" type="number" step="0.01" min="0" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Total for stay (short stay)</label>
              <input name="period_total_payment" type="number" step="0.01" min="0" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Currency</label>
              <input name="currency" defaultValue="ILS" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Start date</label>
              <input name="start_date" type="date" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">End date</label>
              <input name="end_date" type="date" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Payment method</label>
              <select name="payment_method" defaultValue="" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">— None —</option>
                {Object.entries(RENTAL_PAYMENT_METHODS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Bank account</label>
              <select name="bank_account_id" defaultValue="" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">— None —</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.account_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Credit card</label>
              <select name="credit_card_id" defaultValue="" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">— None —</option>
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>{c.card_name} · ****{c.card_last_four}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-400">Notes</label>
              <textarea name="notes" rows={2} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Add rental</button>
            </div>
          </form>

          {property.rentals.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No rentals yet. Use the form above, then add <span className="text-slate-300">tenants</span>, contracts, and transaction links inside each rental.
            </p>
          ) : (
            <div className="space-y-4">
              {property.rentals.map((rental) => (
                <div key={rental.id} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <form action={updateRental} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <input type="hidden" name="id" value={rental.id} />
                    <input type="hidden" name="property_id" value={property.id} />
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Rental type</label>
                      <select name="rental_type" defaultValue={rental.rental_type} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100">
                        {Object.entries(RENTAL_TYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Monthly payment</label>
                      <input type="number" name="monthly_payment" step="0.01" min="0" defaultValue={rental.monthly_payment?.toString() ?? ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Total for stay</label>
                      <input type="number" name="period_total_payment" step="0.01" min="0" defaultValue={rental.period_total_payment?.toString() ?? ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Currency</label>
                      <input name="currency" defaultValue={rental.currency} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Start date</label>
                      <input type="date" name="start_date" defaultValue={rental.start_date ? rental.start_date.toISOString().slice(0, 10) : ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">End date</label>
                      <input type="date" name="end_date" defaultValue={rental.end_date ? rental.end_date.toISOString().slice(0, 10) : ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Payment method</label>
                      <select name="payment_method" defaultValue={rental.payment_method ?? ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100">
                        <option value="">— None —</option>
                        {Object.entries(RENTAL_PAYMENT_METHODS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Bank account</label>
                      <select name="bank_account_id" defaultValue={rental.bank_account_id ?? ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100">
                        <option value="">— None —</option>
                        {bankAccounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.account_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Credit card</label>
                      <select name="credit_card_id" defaultValue={rental.credit_card_id ?? ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100">
                        <option value="">— None —</option>
                        {creditCards.map((c) => (
                          <option key={c.id} value={c.id}>{c.card_name} · ****{c.card_last_four}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-slate-400">Notes</label>
                      <textarea name="notes" rows={2} defaultValue={rental.notes ?? ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                    </div>
                    <div className="flex items-end gap-3">
                      <button type="submit" className="rounded bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-500">Save rental</button>
                      <button formAction={deleteRental.bind(null, rental.id, property.id)} type="submit" className="rounded bg-rose-700 px-3 py-1.5 text-xs text-white hover:bg-rose-600">
                        Delete rental
                      </button>
                    </div>
                  </form>

                  <div className="rounded border border-slate-700 p-3">
                    <p className="mb-1 text-sm font-medium text-slate-200">Tenants</p>
                    <p className="mb-3 text-xs text-slate-500">Who is renting (you can add several).</p>
                    <form action={createRentalTenant} className="mb-2 grid gap-2 sm:grid-cols-4">
                      <input type="hidden" name="rental_id" value={rental.id} />
                      <input name="full_name" required placeholder="Full name" className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100" />
                      <input name="email" placeholder="Email" className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100" />
                      <input name="phone" placeholder="Phone" className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100" />
                      <input name="notes" placeholder="Notes" className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100" />
                      <button type="submit" className="rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-500">Add tenant</button>
                    </form>
                    <div className="space-y-2">
                      {rental.tenants.map((tenant) => (
                        <form key={tenant.id} action={updateRentalTenant} className="grid gap-2 sm:grid-cols-5">
                          <input type="hidden" name="id" value={tenant.id} />
                          <input name="full_name" defaultValue={tenant.full_name} required className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100" />
                          <input name="email" defaultValue={tenant.email ?? ""} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100" />
                          <input name="phone" defaultValue={tenant.phone ?? ""} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100" />
                          <input name="notes" defaultValue={tenant.notes ?? ""} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100" />
                          <div className="flex items-center gap-2">
                            <button type="submit" className="text-xs text-sky-300 hover:text-sky-200">Save</button>
                            <button formAction={deleteRentalTenant.bind(null, tenant.id, property.id)} type="submit" className="text-xs text-rose-400 hover:text-rose-300">Delete</button>
                          </div>
                        </form>
                      ))}
                    </div>
                  </div>

                  <div className="rounded border border-slate-700 p-3">
                    <p className="mb-2 text-xs text-slate-400">Contract files</p>
                    <RentalContractUpload rentalId={rental.id} />
                    <div className="mt-2 space-y-1">
                      {rental.contracts.map((contract) => (
                        <div key={contract.id} className="flex items-center justify-between text-xs text-slate-300">
                          <a href={contract.storage_url ?? "#"} target="_blank" rel="noreferrer" className="truncate text-sky-300 hover:text-sky-200">
                            {contract.file_name}
                          </a>
                          <form action={deleteRentalContract.bind(null, contract.id, property.id)}>
                            <button type="submit" className="text-rose-400 hover:text-rose-300">
                              Delete
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded border border-slate-700 p-3">
                    <p className="mb-2 text-xs text-slate-400">Linked transactions</p>
                    {rental.transactions.length > 0 ? (
                      <ul className="space-y-1 text-xs text-slate-300">
                        {rental.transactions.map((tx) => (
                          <li key={tx.id}>
                            {new Date(tx.transaction_date).toLocaleDateString("en-CA")} · {tx.amount.toString()} · {tx.description ?? "—"}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">No linked transactions yet. Use Import Review to link them.</p>
                    )}
                    <div className="mt-2">
                      <label className="mb-1 block text-xs text-slate-500">Recent transactions not linked to this rental</label>
                      <select className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100">
                        <option value="">Use Import Review page for linking</option>
                        {transactions.filter((t) => t.rental_id !== rental.id).slice(0, 20).map((tx) => (
                          <option key={tx.id} value={tx.id}>
                            {new Date(tx.transaction_date).toLocaleDateString("en-CA")} · {tx.amount.toString()} · {tx.description ?? "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Utility companies</h2>
          <form action={createUtility} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="property_id" value={property.id} />
            <div>
              <label htmlFor="utility_type_new" className="mb-1 block text-xs font-medium text-slate-400">Type</label>
              <select id="utility_type_new" name="utility_type" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                {Object.entries(UTILITY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="provider_name_new" className="mb-1 block text-xs font-medium text-slate-400">Provider name</label>
              <input id="provider_name_new" name="provider_name" required placeholder="e.g. Bezeq" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label htmlFor="payee_id_new" className="mb-1 block text-xs font-medium text-slate-400">Link to payee (optional)</label>
              <select id="payee_id_new" name="payee_id" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">— None —</option>
                {payees.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="account_number_new" className="mb-1 block text-xs font-medium text-slate-400">Account number</label>
              <input id="account_number_new" name="account_number" placeholder="Optional" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label htmlFor="renewal_date_new" className="mb-1 block text-xs font-medium text-slate-400">
                Renewal date (optional)
              </label>
              <input
                id="renewal_date_new"
                name="renewal_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes_new" className="mb-1 block text-xs font-medium text-slate-400">Notes</label>
              <input id="notes_new" name="notes" placeholder="Optional" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Add utility</button>
            </div>
          </form>

          {property.utilities.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No utilities yet. Add one above (e.g. electricity, water, internet).
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Type</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Provider</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Account #</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Renewal</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Notes</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {property.utilities.map((u) => (
                    <tr key={u.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-300">
                        {UTILITY_TYPE_LABELS[u.utility_type] ?? u.utility_type}
                      </td>
                      <td className="px-4 py-3 text-slate-100">{u.provider_name}</td>
                      <td className="px-4 py-3 text-slate-300">{u.account_number || "—"}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {u.renewal_date ? u.renewal_date.toISOString().slice(0, 10) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{u.notes || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/properties/${property.id}/utilities/${u.id}/edit`}
                            className="text-xs font-medium text-sky-400 hover:text-sky-300"
                          >
                            Edit
                          </Link>
                          <form action={deleteUtility.bind(null, u.id, property.id)} className="inline">
                            <button type="submit" className="text-xs font-medium text-rose-400 hover:text-rose-300">Delete</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
