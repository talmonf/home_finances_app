import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { formatRentalTypeLabel } from "@/lib/rental-labels";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    accountId?: string;
    direction?: "all" | "debit" | "credit";
    from?: string;
    to?: string;
    categoryId?: string;
    payeeId?: string;
    memberId?: string;
    rentalId?: string;
    tripId?: string;
    carId?: string;
    jobId?: string;
    subscriptionId?: string;
  }>;
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

export default async function TransactionsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/");
  }

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const resolved = searchParams ? await searchParams : {};
  const accountId = resolved.accountId || "";
  const categoryId = resolved.categoryId || "";
  const payeeId = resolved.payeeId || "";
  const memberId = resolved.memberId || "";
  const rentalId = resolved.rentalId || "";
  const tripId = resolved.tripId || "";
  const carId = resolved.carId || "";
  const jobId = resolved.jobId || "";
  const subscriptionId = resolved.subscriptionId || "";
  const direction = resolved.direction && resolved.direction !== "all" ? resolved.direction : undefined;
  const from = resolved.from ? new Date(resolved.from) : undefined;
  const to = resolved.to ? new Date(resolved.to) : undefined;

  const where: {
    household_id: string;
    import_status: "confirmed";
    bank_account_id?: string;
    category_id?: string;
    payee_id?: string;
    family_member_id?: string;
    rental_id?: string;
    trip_id?: string;
    car_id?: string;
    job_id?: string;
    subscription_id?: string;
    transaction_direction?: "debit" | "credit";
    transaction_date?: { gte?: Date; lte?: Date };
  } = {
    household_id: householdId,
    import_status: "confirmed",
  };

  if (accountId) where.bank_account_id = accountId;
  if (categoryId) where.category_id = categoryId;
  if (payeeId) where.payee_id = payeeId;
  if (memberId) where.family_member_id = memberId;
  if (rentalId) where.rental_id = rentalId;
  if (tripId) where.trip_id = tripId;
  if (carId) where.car_id = carId;
  if (jobId) where.job_id = jobId;
  if (subscriptionId) where.subscription_id = subscriptionId;
  if (direction) where.transaction_direction = direction;
  if (from || to) {
    where.transaction_date = {};
    if (from) where.transaction_date.gte = from;
    if (to) where.transaction_date.lte = to;
  }

  const [transactions, accounts, categories, payees, members, rentals, trips, cars, jobs, subscriptions] =
    await Promise.all([
    prisma.transactions.findMany({
      where,
      include: {
        bank_account: true,
        category: true,
        payee: true,
        family_member: true,
        rental: { include: { property: true } },
        trip: true,
        car: true,
        job: true,
        subscription: true,
      },
      orderBy: { transaction_date: "desc" },
      take: 500,
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { account_name: "asc" },
    }),
    prisma.categories.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { name: "asc" },
    }),
    prisma.payees.findMany({
      where: { household_id: householdId },
      orderBy: { name: "asc" },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.rentals.findMany({
      where: { household_id: householdId, is_active: true },
      include: { property: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.trips.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: [{ start_date: "desc" }, { name: "asc" }],
    }),
    prisma.cars.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: [{ maker: "asc" }, { model: "asc" }],
    }),
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: [{ job_title: "asc" }, { employer_name: "asc" }],
    }),
    prisma.subscriptions.findMany({
      where: { household_id: householdId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href="/"
                className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
              >
                ← Back to dashboard
              </Link>
              <h1 className="text-2xl font-semibold text-slate-50">Transactions</h1>
              <p className="text-sm text-slate-400">
                View confirmed transactions with filters. Import new data from bank statements on the Import page.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-200">Filters</h2>
          <form className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <input type="hidden" name="direction" value={resolved.direction || "all"} />
            <div>
              <label className="mb-1 block text-xs text-slate-400">Bank account</label>
              <select
                name="accountId"
                defaultValue={accountId}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Category</label>
              <select
                name="categoryId"
                defaultValue={categoryId}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Payee</label>
              <select
                name="payeeId"
                defaultValue={payeeId}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All</option>
                {payees.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Family member</label>
              <select
                name="memberId"
                defaultValue={memberId}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Rental</label>
              <select
                name="rentalId"
                defaultValue={rentalId}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All</option>
                {rentals.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.property.name} · {formatRentalTypeLabel(r.rental_type)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Trip</label>
              <select
                name="tripId"
                defaultValue={tripId}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Car</label>
              <select
                name="carId"
                defaultValue={carId}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All</option>
                {cars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.maker} {car.model}
                    {car.plate_number ? ` · ${car.plate_number}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Job</label>
              <select
                name="jobId"
                defaultValue={jobId}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {formatJobDisplayLabel(j)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Subscription</label>
              <select
                name="subscriptionId"
                defaultValue={subscriptionId}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All</option>
                {subscriptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">From date</label>
              <input
                type="date"
                name="from"
                defaultValue={resolved.from || ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">To date</label>
              <input
                type="date"
                name="to"
                defaultValue={resolved.to || ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Apply filters
              </button>
              <Link
                href="/dashboard/transactions"
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </Link>
            </div>
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-200">
              Transactions ({transactions.length} shown, latest first)
            </h2>
          </div>
          {transactions.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No confirmed transactions match your filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-3 py-2 font-medium text-slate-300">Date</th>
                    <th className="px-3 py-2 font-medium text-slate-300">Account</th>
                    <th className="px-3 py-2 font-medium text-slate-300">Amount</th>
                    <th className="px-3 py-2 font-medium text-slate-300">Direction</th>
                    <th className="px-3 py-2 font-medium text-slate-300">Category</th>
                    <th className="px-3 py-2 font-medium text-slate-300">Payee</th>
                    <th className="px-3 py-2 font-medium text-slate-300">Family member</th>
                    <th className="px-3 py-2 font-medium text-slate-300">Rental</th>
                    <th className="px-3 py-2 font-medium text-slate-300">Trip</th>
                    <th className="px-3 py-2 font-medium text-slate-300">Car</th>
                    <th className="px-3 py-2 font-medium text-slate-300">Job</th>
                    <th className="px-3 py-2 font-medium text-slate-300">Subscription</th>
                    <th className="px-3 py-2 font-medium text-slate-300">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-200">
                        {formatHouseholdDate(tx.transaction_date, dateDisplayFormat)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                        {tx.bank_account?.account_name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-200">
                        {formatMoney(tx.amount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                        {tx.transaction_direction}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                        {tx.category?.name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                        {tx.payee?.name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                        {tx.family_member?.full_name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                        {tx.rental ? `${tx.rental.property.name} · ${formatRentalTypeLabel(tx.rental.rental_type)}` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                        {tx.trip?.name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                        {tx.car ? `${tx.car.maker} ${tx.car.model}${tx.car.plate_number ? ` · ${tx.car.plate_number}` : ""}` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                        {tx.job ? (
                          <Link
                            href={`/dashboard/jobs/${tx.job.id}`}
                            className="text-sky-400 hover:text-sky-300"
                          >
                            {formatJobDisplayLabel(tx.job)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[12rem] truncate px-3 py-2 text-slate-300" title={tx.subscription?.name ?? undefined}>
                        {tx.subscription ? (
                          <Link
                            href={`/dashboard/subscriptions/${tx.subscription.id}`}
                            className="text-sky-400 hover:text-sky-300"
                          >
                            {tx.subscription.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[240px] truncate px-3 py-2 text-slate-400" title={tx.description ?? ""}>
                        {tx.description ?? "—"}
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

