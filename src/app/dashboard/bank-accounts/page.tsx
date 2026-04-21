import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { SetupSectionMarkNotDoneBanner } from "@/app/dashboard/setup-section-mark-not-done-banner";
import { formatHouseholdDate } from "@/lib/household-date-format";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardAddButton } from "@/components/dashboard-add-button";
import { DashboardModal } from "@/components/dashboard-modal";
import { createBankAccount } from "./actions";
import BankAccountMemberFields from "./BankAccountMemberFields";
import SortCodeInput from "./SortCodeInput";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    modal?: string;
  }>;
};

function formatSortCode(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 6) return value;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
}

export default async function BankAccountsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  if (!householdId) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const modalMode = resolvedSearchParams?.modal === "new" ? "new" : null;

  const [accounts, familyMembers] = await Promise.all([
    prisma.bank_accounts.findMany({
      where: { household_id: householdId },
      orderBy: { account_name: "asc" },
      include: {
        bank_account_members: {
          include: { family_member: true },
        },
      },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
      select: { id: true, full_name: true },
    }),
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <SetupSectionMarkNotDoneBanner
            sectionId="bankAccounts"
            redirectPath="/dashboard/bank-accounts"
          />
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href="/"
                className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
              >
                {isHebrew ? "חזרה ללוח הבקרה →" : "← Back to dashboard"}
              </Link>
              <h1 className="text-2xl font-semibold text-slate-50">
                Bank accounts
              </h1>
              <p className="text-sm text-slate-400">
                Manage bank accounts for this household. Link family members to each account if needed;
                add accounts before linking credit cards.
              </p>
            </div>
          </div>

          {(resolvedSearchParams?.created ||
            resolvedSearchParams?.updated ||
            resolvedSearchParams?.error) && (
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              <span>
                {resolvedSearchParams.error
                  ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                  : resolvedSearchParams.created
                    ? "Bank account added."
                    : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "רשימה" : "List"}</h2>
            <DashboardAddButton
              basePath="/dashboard/bank-accounts"
              label={isHebrew ? "הוספת חשבון בנק" : "Add bank account"}
            />
          </div>
          {accounts.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No bank accounts yet. Add one above; you need at least one to add credit cards.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Account name</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Bank</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Branch</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Account</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Currency</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Opened</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Website</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Members</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{a.account_name}</td>
                      <td className="px-4 py-3 text-slate-300">{a.bank_name}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {[a.branch_number, a.branch_name, formatSortCode(a.sort_code)]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{a.account_number ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{a.currency}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {a.date_opened ? formatHouseholdDate(a.date_opened, dateDisplayFormat) : "—"}
                      </td>
                      <td className="max-w-[14rem] truncate px-4 py-3 text-slate-400" title={a.website_url ?? undefined}>
                        {a.website_url ? (
                          <a
                            href={a.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:text-sky-300"
                          >
                            {a.website_url}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[12rem] px-4 py-3 text-slate-400">
                        {a.bank_account_members.length === 0
                          ? "—"
                          : a.bank_account_members.map((m) => m.family_member.full_name).join(", ")}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/bank-accounts/${a.id}`}
                          className="text-xs font-medium text-sky-400 hover:text-sky-300"
                        >
                          {isHebrew ? "עריכה" : "Edit"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {modalMode === "new" ? (
          <DashboardModal
            title={isHebrew ? "הוספה חדשה" : "Add new"}
            closeHref="/dashboard/bank-accounts"
            closeLabel={isHebrew ? "סגירה" : "Close"}
          >
            <form
              action={createBankAccount}
              className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
            >
            <div>
              <label htmlFor="account_name" className="mb-1 block text-xs font-medium text-slate-400">
                Account name
              </label>
              <input
                id="account_name"
                name="account_name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. Main checking"
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
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. Bank Hapoalim"
              />
            </div>
            <div>
              <label htmlFor="branch_number" className="mb-1 block text-xs font-medium text-slate-400">
                Branch number
              </label>
              <input
                id="branch_number"
                name="branch_number"
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
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>
            <div>
              <label htmlFor="account_number" className="mb-1 block text-xs font-medium text-slate-400">
                Account number
              </label>
              <input
                id="account_number"
                name="account_number"
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
                placeholder="Optional (e.g. 12-34-56)"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="date_opened" className="mb-1 block text-xs font-medium text-slate-400">
                Opened date (optional)
              </label>
              <input
                id="date_opened"
                name="date_opened"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="currency" className="mb-1 block text-xs font-medium text-slate-400">
                Currency
              </label>
              <input
                id="currency"
                name="currency"
                defaultValue="ILS"
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
                defaultValue="IL"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="website_url" className="mb-1 block text-xs font-medium text-slate-400">
                Website / URL
              </label>
              <input
                id="website_url"
                name="website_url"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional (e.g. bank.example.com)"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>
            <BankAccountMemberFields familyMembers={familyMembers} />
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                {isHebrew ? "הוספת חשבון בנק" : "Add bank account"}
              </button>
            </div>
            </form>
          </DashboardModal>
        ) : null}
      </div>
    </div>
  );
}
