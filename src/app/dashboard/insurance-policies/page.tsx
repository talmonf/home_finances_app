import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createInsurancePolicy, toggleInsurancePolicyActive } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatPremium(paid: { toString(): string }, currency: string) {
  const n = Number(paid.toString());
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default async function InsurancePoliciesPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [policies, cars] = await Promise.all([
    prisma.insurance_policies.findMany({
      where: { household_id: householdId },
      include: { car: true },
      orderBy: { expiration_date: "asc" },
    }),
    prisma.cars.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: [{ maker: "asc" }, { model: "asc" }],
    }),
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div>
            <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
              ← Back to dashboard
            </Link>
            <h1 className="text-2xl font-semibold text-slate-50">Car insurance policies</h1>
            <p className="text-sm text-slate-400">
              Each policy is tied to a vehicle: start date, premium paid, renewal expiry, and provider details.
            </p>
          </div>
          {(resolvedSearchParams?.created ||
            resolvedSearchParams?.updated ||
            resolvedSearchParams?.error) && (
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams?.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              <span>
                {resolvedSearchParams?.error
                  ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                  : resolvedSearchParams?.created
                    ? "Insurance policy added."
                    : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add new</h2>
          {cars.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
              Add a vehicle under{" "}
              <Link href="/dashboard/cars" className="text-sky-400 hover:text-sky-300">
                Cars
              </Link>{" "}
              before you can record insurance.
            </p>
          ) : (
            <form
              action={createInsurancePolicy}
              className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <div>
                <label htmlFor="car_id" className="mb-1 block text-xs font-medium text-slate-400">
                  Car <span className="text-rose-400">*</span>
                </label>
                <select
                  id="car_id"
                  name="car_id"
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">Select vehicle…</option>
                  {cars.map((car) => (
                    <option key={car.id} value={car.id}>
                      {car.maker} {car.model}
                      {car.plate_number ? ` (${car.plate_number})` : ""}
                      {car.custom_name ? ` — ${car.custom_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="provider_name" className="mb-1 block text-xs font-medium text-slate-400">
                  Provider <span className="text-rose-400">*</span>
                </label>
                <input
                  id="provider_name"
                  name="provider_name"
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  placeholder="e.g. Harel"
                />
              </div>
              <div>
                <label htmlFor="policy_name" className="mb-1 block text-xs font-medium text-slate-400">
                  Policy name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="policy_name"
                  name="policy_name"
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  placeholder="e.g. Comprehensive"
                />
              </div>
              <div>
                <label htmlFor="policy_start_date" className="mb-1 block text-xs font-medium text-slate-400">
                  Policy taken out on <span className="text-rose-400">*</span>
                </label>
                <input
                  id="policy_start_date"
                  name="policy_start_date"
                  type="date"
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="expiration_date" className="mb-1 block text-xs font-medium text-slate-400">
                  Expiration date <span className="text-rose-400">*</span>
                </label>
                <input
                  id="expiration_date"
                  name="expiration_date"
                  type="date"
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="premium_paid" className="mb-1 block text-xs font-medium text-slate-400">
                  Amount paid <span className="text-rose-400">*</span>
                </label>
                <input
                  id="premium_paid"
                  name="premium_paid"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="premium_currency" className="mb-1 block text-xs font-medium text-slate-400">
                  Currency <span className="text-rose-400">*</span>
                </label>
                <select
                  id="premium_currency"
                  name="premium_currency"
                  required
                  defaultValue="ILS"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="ILS">ILS</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-3 xl:col-span-1">
                <button
                  type="submit"
                  className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Add policy
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">List</h2>
          {policies.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No insurance policies yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Car</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Provider</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Policy</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Taken out</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Premium</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Expires</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <tr key={p.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-200">
                        <Link
                          href={`/dashboard/cars/${p.car_id}`}
                          className="text-sky-400 hover:text-sky-300"
                        >
                          {p.car.maker} {p.car.model}
                          {p.car.plate_number ? ` (${p.car.plate_number})` : ""}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-100">{p.provider_name}</td>
                      <td className="px-4 py-3 text-slate-300">{p.policy_name}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(p.policy_start_date)}</td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">
                        {formatPremium(p.premium_paid, p.premium_currency)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(p.expiration_date)}</td>
                      <td className="px-4 py-3">
                        <span className={p.is_active ? "text-emerald-400" : "text-slate-500"}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <form
                          action={toggleInsurancePolicyActive.bind(null, p.id, !p.is_active)}
                          className="inline"
                        >
                          <button type="submit" className="text-xs font-medium text-sky-400 hover:text-sky-300">
                            {p.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
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
