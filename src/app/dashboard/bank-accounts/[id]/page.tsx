import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updateBankAccount } from "../actions";
import BankAccountMemberFields from "../BankAccountMemberFields";
import SortCodeInput from "../SortCodeInput";
import BankAccountStatusFields from "../BankAccountStatusFields";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    updated?: string;
  }>;
};

export default async function BankAccountDetailPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [account, familyMembers] = await Promise.all([
    prisma.bank_accounts.findFirst({
      where: { id, household_id: householdId },
      include: { bank_account_members: true },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
      select: { id: true, full_name: true },
    }),
  ]);

  if (!account) redirect("/dashboard/bank-accounts?error=Not+found");

  const linkedMemberIds = account.bank_account_members.map((m) => m.family_member_id);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/bank-accounts"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back to bank accounts
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Edit bank account</h1>

          {resolvedSearchParams?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))}
            </div>
          )}
          {resolvedSearchParams?.updated && (
            <div className="rounded-lg border border-emerald-600 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">
              Bank account updated.
            </div>
          )}
        </header>

        <section className="space-y-4">
          <form
            action={updateBankAccount}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input type="hidden" name="id" value={account.id} />

            <div className="sm:col-span-2 lg:col-span-4">
              <h2 className="text-lg font-medium text-slate-200">Account details</h2>
            </div>

            <div>
              <label htmlFor="account_name" className="mb-1 block text-xs font-medium text-slate-400">
                Account name
              </label>
              <input
                id="account_name"
                name="account_name"
                required
                defaultValue={account.account_name}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="bank_name" className="mb-1 block text-xs font-medium text-slate-400">
                Bank name
              </label>
              <input
                id="bank_name"
                name="bank_name"
                required
                defaultValue={account.bank_name}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="branch_number" className="mb-1 block text-xs font-medium text-slate-400">
                Branch number
              </label>
              <input
                id="branch_number"
                name="branch_number"
                defaultValue={account.branch_number ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="branch_name" className="mb-1 block text-xs font-medium text-slate-400">
                Branch name
              </label>
              <input
                id="branch_name"
                name="branch_name"
                defaultValue={account.branch_name ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="sort_code" className="mb-1 block text-xs font-medium text-slate-400">
                Sort code (12-34-56)
              </label>
              <SortCodeInput
                id="sort_code"
                name="sort_code"
                defaultValue={account.sort_code}
                placeholder="Optional (e.g. 12-34-56)"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="account_number" className="mb-1 block text-xs font-medium text-slate-400">
                Account number
              </label>
              <input
                id="account_number"
                name="account_number"
                defaultValue={account.account_number ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="currency" className="mb-1 block text-xs font-medium text-slate-400">
                Currency
              </label>
              <input
                id="currency"
                name="currency"
                defaultValue={account.currency}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="country" className="mb-1 block text-xs font-medium text-slate-400">
                Country
              </label>
              <input
                id="country"
                name="country"
                defaultValue={account.country}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <BankAccountStatusFields
                initialIsActive={account.is_active}
                initialDateClosed={account.date_closed ? account.date_closed.toISOString().slice(0, 10) : null}
              />
            </div>

            <BankAccountMemberFields familyMembers={familyMembers} selectedIds={linkedMemberIds} />

            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={account.notes ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Save changes
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

