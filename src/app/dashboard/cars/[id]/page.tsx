import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CarLicenseCreateForm } from "@/components/car-license-create-form";
import { CarLicenseRow } from "@/components/car-license-row";
import { CarServiceRow } from "@/components/car-service-row";
import { createCarService, updateCar } from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function dateInputValue(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

function formatInsurancePremium(paid: { toString(): string }, currency: string) {
  const n = Number(paid.toString());
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default async function CarDetailsPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const { id } = await params;
  const resolved = searchParams ? await searchParams : undefined;

  const [car, familyMembers, creditCards, bankAccounts, services, licenses, insurancePolicies] =
    await Promise.all([
    prisma.cars.findFirst({
      where: { id, household_id: householdId },
      include: { main_driver: true, purchase_credit_card: true, purchase_bank_account: true },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.credit_cards.findMany({
      where: { household_id: householdId, cancelled_at: null },
      orderBy: { card_name: "asc" },
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { account_name: "asc" },
    }),
    prisma.car_services.findMany({
      where: { household_id: householdId, car_id: id },
      include: { credit_card: true, bank_account: true },
      orderBy: { serviced_at: "desc" },
    }),
    prisma.car_licenses.findMany({
      where: { household_id: householdId, car_id: id },
      include: { credit_card: true, bank_account: true },
      orderBy: { expires_at: "asc" },
    }),
    prisma.insurance_policies.findMany({
      where: { household_id: householdId, car_id: id, is_active: true },
      orderBy: { expiration_date: "asc" },
    }),
  ]);

  if (!car) notFound();

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <Link href="/dashboard/cars" className="inline-block text-sm text-slate-400 hover:text-slate-200">
            ← Back to cars
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">
            {car.custom_name ? `${car.custom_name} — ` : ""}
            {car.maker} {car.model} {car.model_year ? `(${car.model_year})` : ""}
          </h1>
          {resolved?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolved.error.replace(/\+/g, " "))}
            </div>
          )}
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-200">Car details</h2>
          <form action={updateCar} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-3">
            <input type="hidden" name="id" value={car.id} />
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Car name</label>
              <input name="custom_name" defaultValue={car.custom_name ?? ""} placeholder="e.g. Kona (Talmon)" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Maker</label>
              <input name="maker" defaultValue={car.maker} required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Model</label>
              <input name="model" defaultValue={car.model} required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Model year</label>
              <input name="model_year" type="number" defaultValue={car.model_year ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Plate number</label>
              <input name="plate_number" defaultValue={car.plate_number ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Main driver</label>
              <select name="main_driver_family_member_id" defaultValue={car.main_driver_family_member_id ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">Not set</option>
                {familyMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="block text-xs text-slate-400">General notes</label>
              <textarea name="notes" defaultValue={car.notes ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Purchase date</label>
              <input name="purchase_date" type="date" defaultValue={dateInputValue(car.purchase_date)} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Purchase amount</label>
              <input name="purchase_amount" type="number" step="0.01" defaultValue={car.purchase_amount?.toString() ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Purchased from</label>
              <input name="purchased_from" defaultValue={car.purchased_from ?? ""} placeholder="Dealer, private seller…" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Km at purchase</label>
              <input name="purchase_odometer_km" type="number" min="0" defaultValue={car.purchase_odometer_km ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Extra purchase costs</label>
              <input name="extra_purchase_costs" type="number" step="0.01" min="0" defaultValue={car.extra_purchase_costs?.toString() ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="block text-xs text-slate-400">Extra purchase costs notes</label>
              <textarea name="extra_purchase_costs_notes" defaultValue={car.extra_purchase_costs_notes ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Purchase payment method</label>
              <select name="purchase_payment_method" defaultValue={car.purchase_payment_method ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">Not set</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit card</option>
                <option value="bank_account">Bank account</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Purchase credit card</label>
              <select name="purchase_credit_card_id" defaultValue={car.purchase_credit_card_id ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">Not set</option>
                {creditCards.map((c) => <option key={c.id} value={c.id}>{c.card_name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Purchase bank account</label>
              <select name="purchase_bank_account_id" defaultValue={car.purchase_bank_account_id ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">Not set</option>
                {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.account_name}</option>)}
              </select>
            </div>
            <textarea name="purchase_notes" defaultValue={car.purchase_notes ?? ""} placeholder="Purchase notes" className="md:col-span-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Sale date</label>
              <input name="sold_at" type="date" defaultValue={dateInputValue(car.sold_at)} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Sale amount</label>
              <input name="sold_amount" type="number" step="0.01" defaultValue={car.sold_amount?.toString() ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Sold to</label>
              <input name="sold_to" defaultValue={car.sold_to ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <textarea name="sale_notes" defaultValue={car.sale_notes ?? ""} placeholder="Sale notes" className="md:col-span-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Save car</button>
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-200">Insurance policies linked to this car</h2>
            <Link href="/dashboard/insurance-policies" className="text-xs text-sky-400 hover:text-sky-300">Manage insurance</Link>
          </div>
          {insurancePolicies.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">No linked insurance policies yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-3 py-2 text-slate-300">Provider</th>
                    <th className="px-3 py-2 text-slate-300">Policy</th>
                    <th className="px-3 py-2 text-slate-300">Taken out</th>
                    <th className="px-3 py-2 text-slate-300">Premium</th>
                    <th className="px-3 py-2 text-slate-300">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {insurancePolicies.map((p) => (
                    <tr key={p.id} className="border-b border-slate-700/80">
                      <td className="px-3 py-2 text-slate-100">{p.provider_name}</td>
                      <td className="px-3 py-2 text-slate-300">{p.policy_name}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {p.policy_start_date ? formatHouseholdDate(p.policy_start_date, dateDisplayFormat) : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-300 tabular-nums">
                        {formatInsurancePremium(p.premium_paid, p.premium_currency)}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {formatHouseholdDate(p.expiration_date, dateDisplayFormat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-200">Petrol fill-ups</h2>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="mb-4 text-sm text-slate-400">
              Log fill-ups on a separate screen with larger controls, built for quick entry on your phone.
            </p>
            <Link
              href={`/dashboard/petrol-fillups?carId=${car.id}`}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white hover:bg-emerald-500 sm:w-auto"
            >
              Open petrol fill-up
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-200">Services</h2>
          <form action={createCarService} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-3">
            <input type="hidden" name="car_id" value={car.id} />
            <input name="provider_name" required placeholder="Service location/provider" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="serviced_at" type="date" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <div className="space-y-1">
              <label className="block text-xs text-slate-400" htmlFor="new-service-next-at">
                Next service date (optional)
              </label>
              <input
                id="new-service-next-at"
                name="next_service_at"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <input name="cost_amount" type="number" step="0.01" placeholder="Cost" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="odometer_km" type="number" placeholder="Odometer km" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <select name="credit_card_id" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"><option value="">Credit card (optional)</option>{creditCards.map((c) => <option key={c.id} value={c.id}>{c.card_name}</option>)}</select>
            <select name="bank_account_id" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"><option value="">Bank account (optional)</option>{bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.account_name}</option>)}</select>
            <input name="notes" placeholder="Service notes" className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <p className="md:col-span-3 text-xs text-slate-500">
              Optional <span className="text-slate-400">next service date</span> appears on Upcoming Renewals. Attach invoices or work orders from <span className="text-slate-400">Edit</span> after the service is saved.
            </p>
            <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Add service</button>
          </form>
          {services.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-3 py-2 text-slate-300">Service date</th>
                    <th className="px-3 py-2 text-slate-300">Next service</th>
                    <th className="px-3 py-2 text-slate-300">Provider</th>
                    <th className="px-3 py-2 text-slate-300">Cost</th>
                    <th className="px-3 py-2 text-slate-300">Km</th>
                    <th className="px-3 py-2 text-slate-300">Payment</th>
                    <th className="px-3 py-2 text-slate-300">Details file</th>
                    <th className="px-3 py-2 text-slate-300">Notes</th>
                    <th className="px-3 py-2 text-slate-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <CarServiceRow
                      key={s.id}
                      carId={car.id}
                      service={{
                        id: s.id,
                        servicedAt: dateInputValue(s.serviced_at),
                        nextServiceAt: s.next_service_at ? dateInputValue(s.next_service_at) : "",
                        providerName: s.provider_name,
                        costAmount: s.cost_amount?.toString() ?? "",
                        odometerKm: s.odometer_km,
                        creditCardId: s.credit_card_id ?? "",
                        bankAccountId: s.bank_account_id ?? "",
                        notes: s.notes ?? "",
                        hasAttachment: Boolean(s.receipt_storage_key),
                        paymentLabel: s.credit_card?.card_name ?? s.bank_account?.account_name ?? "—",
                      }}
                      creditCards={creditCards.map((c) => ({ id: c.id, label: c.card_name }))}
                      bankAccounts={bankAccounts.map((b) => ({ id: b.id, label: b.account_name }))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-medium text-slate-200">Licenses</h2>
            <p className="mt-1 text-xs text-slate-500">
              <span className="font-medium text-slate-400">Renewal / payment date</span> is when you paid (optional).{" "}
              <span className="font-medium text-slate-400">Expires on</span> is when the license stops being valid (required).
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <CarLicenseCreateForm
              carId={car.id}
              creditCards={creditCards.map((c) => ({ id: c.id, label: c.card_name }))}
              bankAccounts={bankAccounts.map((b) => ({ id: b.id, label: b.account_name }))}
            />
          </div>
          {licenses.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-3 py-2 text-slate-300">Renewal / paid</th>
                    <th className="px-3 py-2 text-slate-300">Expires</th>
                    <th className="px-3 py-2 text-slate-300">Cost</th>
                    <th className="px-3 py-2 text-slate-300">Payment</th>
                    <th className="px-3 py-2 text-slate-300">Receipt</th>
                    <th className="px-3 py-2 text-slate-300">Notes</th>
                    <th className="px-3 py-2 text-slate-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((l) => (
                    <CarLicenseRow
                      key={l.id}
                      carId={car.id}
                      license={{
                        id: l.id,
                        renewedAt: dateInputValue(l.renewed_at),
                        expiresAt: dateInputValue(l.expires_at),
                        costAmount: l.cost_amount?.toString() ?? "",
                        creditCardId: l.credit_card_id ?? "",
                        bankAccountId: l.bank_account_id ?? "",
                        notes: l.notes ?? "",
                        hasReceipt: Boolean(l.receipt_storage_key),
                        paymentLabel: l.credit_card?.card_name ?? l.bank_account?.account_name ?? "—",
                      }}
                      creditCards={creditCards.map((c) => ({ id: c.id, label: c.card_name }))}
                      bankAccounts={bankAccounts.map((b) => ({ id: b.id, label: b.account_name }))}
                    />
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
