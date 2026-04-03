import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoanForm } from "../LoanForm";
import { updateLoan } from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    updated?: string;
  }>;
};

function formatDateInput(d: Date | null) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function EditLoanPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const loan = await prisma.loans.findFirst({
    where: { id, household_id: householdId },
  });

  if (!loan) {
    redirect("/dashboard/loans?error=Not+found");
  }

  const initial = {
    loan_date: formatDateInput(loan.loan_date),
    loan_amount: loan.loan_amount.toFixed(2),
    currency: loan.currency,
    institution_name: loan.institution_name,
    loan_number: loan.loan_number,
    monthly_repayment_amount: loan.monthly_repayment_amount
      ? loan.monthly_repayment_amount.toFixed(2)
      : "",
    repayment_day_of_month: loan.repayment_day_of_month ?? null,
    maturity_date: loan.maturity_date ? formatDateInput(loan.maturity_date) : "",
    total_repayment_amount: loan.total_repayment_amount ? loan.total_repayment_amount.toFixed(2) : "",
    purpose: loan.purpose,
    notes: loan.notes,
    is_active: loan.is_active,
  };

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div>
            <Link href="/dashboard/loans" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
              ← Back to loans
            </Link>
            <h1 className="text-2xl font-semibold text-slate-50">Edit loan</h1>
            <p className="text-sm text-slate-400">Update amounts, schedule, and status.</p>
          </div>

          {resolvedSearchParams?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))}
            </div>
          )}
          {resolvedSearchParams?.updated && !resolvedSearchParams?.error && (
            <div className="rounded-lg border border-emerald-600 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">
              Updated.
            </div>
          )}
        </header>

        <LoanForm action={updateLoan} loanId={loan.id} initial={initial} />
      </div>
    </div>
  );
}
