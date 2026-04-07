import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createLoan } from "./actions";
import { LoanForm } from "./LoanForm";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
  }>;
};

function formatMoney(value: unknown) {
  if (value == null) return "—";
  const n =
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value
      ? (value as { toNumber(): number }).toNumber()
      : Number(value);
  return Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: unknown, digits = 2) {
  if (value == null) return null;
  const n =
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value
      ? (value as { toNumber(): number }).toNumber()
      : Number(value);
  if (Number.isNaN(n)) return null;
  return `${n.toLocaleString("en-IL", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

function formatLoanInterestRate(loan: {
  interest_rate_percent: unknown;
  interest_rate_linked_index: string | null;
  interest_rate_index_delta_percent: unknown;
}) {
  if (loan.interest_rate_linked_index && loan.interest_rate_index_delta_percent != null) {
    const deltaNumber =
      typeof loan.interest_rate_index_delta_percent === "object" &&
      loan.interest_rate_index_delta_percent !== null &&
      "toNumber" in loan.interest_rate_index_delta_percent
        ? (loan.interest_rate_index_delta_percent as { toNumber(): number }).toNumber()
        : Number(loan.interest_rate_index_delta_percent);
    const deltaAbs = Math.abs(deltaNumber);
    const deltaSign = deltaNumber < 0 ? "-" : "+";
    return `${loan.interest_rate_linked_index} ${deltaSign} ${deltaAbs.toLocaleString("en-IL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;
  }
  return formatPercent(loan.interest_rate_percent) ?? "—";
}

export default async function LoansPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const rows = await prisma.loans.findMany({
    where: { household_id: householdId },
    orderBy: [{ created_at: "desc" }],
  });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div>
            <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
              ← Back to dashboard
            </Link>
            <h1 className="text-2xl font-semibold text-slate-50">Loans</h1>
            <p className="text-sm text-slate-400">
              Track loan principal, lender, monthly payment schedule, maturity, and purpose. Active loans with a
              repayment day or maturity appear on Upcoming renewals.
            </p>
          </div>

          {(resolvedSearchParams?.created || resolvedSearchParams?.error) && (
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
                  : "Loan saved."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add loan</h2>
          <LoanForm action={createLoan} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Your loans</h2>
          {rows.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No loans yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Institution</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Loan #</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Loan date</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Amount</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Interest</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Monthly</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Day / Maturity</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Total repay</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Purpose</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((loan) => (
                    <tr key={loan.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{loan.institution_name}</td>
                      <td className="px-4 py-3 text-slate-400">{loan.loan_number ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatHouseholdDate(loan.loan_date, dateDisplayFormat)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatMoney(loan.loan_amount)} {loan.currency}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatLoanInterestRate(loan)}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatMoney(loan.monthly_repayment_amount)} {loan.currency}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <div>{loan.repayment_day_of_month != null ? `${loan.repayment_day_of_month} (monthly)` : "—"}</div>
                        <div className="text-xs text-slate-500">
                          Maturity:{" "}
                          {loan.maturity_date
                            ? formatHouseholdDate(loan.maturity_date, dateDisplayFormat)
                            : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatMoney(loan.total_repayment_amount)} {loan.currency}
                      </td>
                      <td className="max-w-[10rem] truncate px-4 py-3 text-slate-500" title={loan.purpose ?? undefined}>
                        {loan.purpose ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={loan.is_active ? "text-emerald-400" : "text-slate-500"}>
                          {loan.is_active ? "Active" : "Historic"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/loans/${loan.id}`}
                          className="text-xs font-medium text-sky-400 hover:text-sky-300"
                        >
                          Edit
                        </Link>
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
