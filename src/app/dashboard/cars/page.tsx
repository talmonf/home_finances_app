import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { SetupSectionMarkNotDoneBanner } from "@/app/dashboard/setup-section-mark-not-done-banner";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createCar } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string }>;
};

function formatMoney(value: unknown) {
  if (value == null) return "—";
  const n =
    typeof value === "object" && value !== null && "toNumber" in value
      ? (value as { toNumber(): number }).toNumber()
      : Number(value);
  return Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function CarsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const resolved = searchParams ? await searchParams : undefined;

  const [cars, familyMembers, creditCards, bankAccounts] = await Promise.all([
    prisma.cars.findMany({
      where: { household_id: householdId },
      include: { main_driver: true },
      orderBy: [{ maker: "asc" }, { model: "asc" }],
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
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <SetupSectionMarkNotDoneBanner
            sectionId="cars"
            redirectPath="/dashboard/cars"
          />
          <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Cars</h1>
          <p className="text-sm text-slate-400">
            Record vehicles, purchase/sale details, driver ownership, petrol fill-ups, services, licenses, and linked insurance.
          </p>
          {(resolved?.created || resolved?.updated || resolved?.error) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                resolved.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              {resolved.error
                ? decodeURIComponent(resolved.error.replace(/\+/g, " "))
                : resolved.created
                  ? "Car added."
                  : "Updated."}
            </div>
          )}
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-200">Add car</h2>
          <form action={createCar} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-3">
            <input name="custom_name" placeholder="Car name (e.g. Kona (Talmon))" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="maker" placeholder="Maker (e.g. Hyundai)" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="model" placeholder="Model (e.g. Kona)" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="model_year" placeholder="Model year" type="number" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="plate_number" placeholder="Plate number" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <select name="main_driver_family_member_id" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
              <option value="">Main driver (optional)</option>
              {familyMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Purchase date</label>
              <input name="purchase_date" type="date" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <input name="purchase_amount" placeholder="Purchase amount" type="number" step="0.01" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="purchased_from" placeholder="Purchased from (dealer, private…)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="purchase_odometer_km" placeholder="Km at purchase" type="number" min="0" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="extra_purchase_costs" placeholder="Extra purchase costs" type="number" step="0.01" min="0" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <textarea name="extra_purchase_costs_notes" placeholder="Extra purchase costs notes" className="md:col-span-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <select name="purchase_payment_method" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
              <option value="">Purchase payment method</option>
              <option value="cash">Cash</option>
              <option value="credit_card">Credit card</option>
              <option value="bank_account">Bank account</option>
              <option value="other">Other</option>
            </select>
            <select name="purchase_credit_card_id" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
              <option value="">Purchase credit card (optional)</option>
              {creditCards.map((c) => <option key={c.id} value={c.id}>{c.card_name}</option>)}
            </select>
            <select name="purchase_bank_account_id" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
              <option value="">Purchase bank account (optional)</option>
              {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.account_name}</option>)}
            </select>
            <textarea name="purchase_notes" placeholder="Purchase notes" className="md:col-span-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Sale date</label>
              <input name="sold_at" type="date" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <input name="sold_amount" placeholder="Sold amount" type="number" step="0.01" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="sold_to" placeholder="Sold to" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <textarea name="sale_notes" placeholder="Sale notes" className="md:col-span-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <textarea name="notes" placeholder="Notes" className="md:col-span-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Add car</button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-200">Cars list</h2>
          {cars.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
              No cars yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-3 py-2 text-slate-300">Car</th>
                    <th className="px-3 py-2 text-slate-300">Plate</th>
                    <th className="px-3 py-2 text-slate-300">Main driver</th>
                    <th className="px-3 py-2 text-slate-300">Purchase</th>
                    <th className="px-3 py-2 text-slate-300">Sale</th>
                    <th className="px-3 py-2 text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map((car) => (
                    <tr key={car.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-slate-100">
                        <Link href={`/dashboard/cars/${car.id}`} className="text-sky-400 hover:text-sky-300">
                          {car.custom_name ? `${car.custom_name} — ` : ""}
                          {car.maker} {car.model} {car.model_year ? `(${car.model_year})` : ""}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-300">{car.plate_number ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-300">{car.main_driver?.full_name ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-300">{formatMoney(car.purchase_amount)}</td>
                      <td className="px-3 py-2 text-slate-300">{formatMoney(car.sold_amount)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Link
                            href={`/dashboard/petrol-fillups?carId=${car.id}`}
                            className="text-xs text-emerald-400 hover:text-emerald-300"
                          >
                            Petrol
                          </Link>
                          <Link
                            href={`/dashboard/cars/${car.id}`}
                            className="text-xs text-sky-400 hover:text-sky-300"
                          >
                            Edit
                          </Link>
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
