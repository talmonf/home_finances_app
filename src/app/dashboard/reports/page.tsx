import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    period?: "month" | "year";
    year?: string;
    month?: string;
    accountId?: string;
    memberId?: string;
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

export default async function ReportsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/");
  }

  const now = new Date();
  const resolved = searchParams ? await searchParams : {};
  const period = resolved.period === "year" ? "year" : "month";
  const year = Number(resolved.year || now.getFullYear());
  const month = period === "month" ? Number(resolved.month || now.getMonth() + 1) : undefined;
  const accountId = resolved.accountId || "";
  const memberId = resolved.memberId || "";

  const from =
    period === "month"
      ? new Date(year, (month ?? 1) - 1, 1)
      : new Date(year, 0, 1);
  const to =
    period === "month"
      ? new Date(year, (month ?? 1), 0, 23, 59, 59, 999)
      : new Date(year, 11, 31, 23, 59, 59, 999);

  const where: any = {
    household_id: householdId,
    import_status: "confirmed",
    transaction_date: {
      gte: from,
      lte: to,
    },
    NOT: {
      transaction_type: "transfer",
    },
  };
  if (accountId) where.bank_account_id = accountId;
  if (memberId) where.family_member_id = memberId;

  const [rows, accounts, members] = await Promise.all([
    prisma.transactions.groupBy({
      by: ["category_id", "transaction_direction"],
      where,
      _sum: {
        amount: true,
      },
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { account_name: "asc" },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  const categories = await prisma.categories.findMany({
    where: {
      household_id: householdId,
      id: { in: rows.map((r) => r.category_id).filter((id): id is string => !!id) },
    },
  });
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const income = rows
    .filter((r) => r.transaction_direction === "credit")
    .reduce((sum, r) => sum + Number(r._sum.amount ?? 0), 0);
  const expenses = rows
    .filter((r) => r.transaction_direction === "debit")
    .reduce((sum, r) => sum + Number(r._sum.amount ?? 0), 0);
  const net = income - expenses;

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href="/"
                className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
              >
                ← Back to dashboard
              </Link>
              <h1 className="text-2xl font-semibold text-slate-50">Reports</h1>
              <p className="text-sm text-slate-400">
                Basic P&amp;L built from confirmed transactions. Transfers are excluded.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-200">Filters</h2>
          <form className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Period</label>
              <select
                name="period"
                defaultValue={period}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Year</label>
              <input
                type="number"
                name="year"
                defaultValue={String(year)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            {period === "month" && (
              <div>
                <label className="mb-1 block text-xs text-slate-400">Month</label>
                <input
                  type="number"
                  name="month"
                  min={1}
                  max={12}
                  defaultValue={month ?? now.getMonth() + 1}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            )}
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
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Apply filters
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <div className="text-xs text-slate-400">Income (credits)</div>
              <div className="mt-1 text-xl font-semibold text-emerald-400">
                {formatMoney(income)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <div className="text-xs text-slate-400">Expenses (debits)</div>
              <div className="mt-1 text-xl font-semibold text-rose-400">
                {formatMoney(expenses)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <div className="text-xs text-slate-400">Net</div>
              <div
                className={`mt-1 text-xl font-semibold ${
                  net >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatMoney(net)}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-4 py-2 font-medium text-slate-300">Category</th>
                  <th className="px-4 py-2 font-medium text-slate-300">Direction</th>
                  <th className="px-4 py-2 font-medium text-slate-300">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-4 text-center text-sm text-slate-400"
                    >
                      No confirmed transactions found for this period and filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const cat = r.category_id ? categoryById.get(r.category_id) : null;
                    const label = cat?.name ?? "(Uncategorized)";
                    const sign =
                      r.transaction_direction === "debit"
                        ? -1
                        : 1;
                    const amount = sign * Number(r._sum.amount ?? 0);
                    return (
                      <tr
                        key={`${r.category_id ?? "none"}-${r.transaction_direction}-${idx}`}
                        className="border-b border-slate-800/60 hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-2 text-slate-200">{label}</td>
                        <td className="px-4 py-2 text-slate-400">
                          {r.transaction_direction}
                        </td>
                        <td className="px-4 py-2 text-slate-200">
                          {formatMoney(amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

