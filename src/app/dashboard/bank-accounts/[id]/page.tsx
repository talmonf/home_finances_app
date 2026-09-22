import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { HouseholdDateField } from "@/components/household-date-field";
import { SensitiveTextInput, SensitiveTextarea } from "@/components/sensitive-fields";
import { utcDateToHtmlDateInputValue } from "@/lib/household-date-format";
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
  }>;
};

export default async function BankAccountDetailPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const isHebrew = uiLanguage === "he";

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
  const inputClass =
    "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100";

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-screen-2xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/bank-accounts"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה לחשבונות בנק →" : "← Back to bank accounts"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">{isHebrew ? "עריכת חשבון בנק" : "Edit bank account"}</h1>

          {resolvedSearchParams?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))}
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
              <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "פרטי חשבון" : "Account details"}</h2>
            </div>

            <div>
              <label htmlFor="account_name" className="mb-1 block text-xs font-medium text-slate-400">
                Account name
              </label>
              <SensitiveTextInput
                obfuscate={obfuscate}
                id="account_name"
                name="account_name"
                required
                value={account.account_name}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="bank_name" className="mb-1 block text-xs font-medium text-slate-400">
                Bank name
              </label>
              <SensitiveTextInput
                obfuscate={obfuscate}
                id="bank_name"
                name="bank_name"
                required
                value={account.bank_name}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="branch_number" className="mb-1 block text-xs font-medium text-slate-400">
                Branch number
              </label>
              <SensitiveTextInput
                obfuscate={obfuscate}
                id="branch_number"
                name="branch_number"
                value={account.branch_number ?? ""}
                className={inputClass}
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="branch_name" className="mb-1 block text-xs font-medium text-slate-400">
                Branch name
              </label>
              <SensitiveTextInput
                obfuscate={obfuscate}
                id="branch_name"
                name="branch_name"
                value={account.branch_name ?? ""}
                className={inputClass}
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="sort_code" className="mb-1 block text-xs font-medium text-slate-400">
                Sort code (12-34-56)
              </label>
              {obfuscate && (account.sort_code ?? "").trim() !== "" ? (
                <SensitiveTextInput
                  obfuscate={obfuscate}
                  id="sort_code"
                  name="sort_code"
                  value={account.sort_code}
                  className={inputClass}
                  placeholder="Optional (e.g. 12-34-56)"
                />
              ) : (
                <SortCodeInput
                  id="sort_code"
                  name="sort_code"
                  defaultValue={account.sort_code}
                  placeholder="Optional (e.g. 12-34-56)"
                  className={inputClass}
                />
              )}
            </div>

            <div>
              <label htmlFor="account_number" className="mb-1 block text-xs font-medium text-slate-400">
                Account number
              </label>
              <SensitiveTextInput
                obfuscate={obfuscate}
                id="account_number"
                name="account_number"
                value={account.account_number ?? ""}
                className={inputClass}
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="date_opened" className="mb-1 block text-xs font-medium text-slate-400">
                Opened date (optional)
              </label>
              <HouseholdDateField
                id="date_opened"
                name="date_opened"
                defaultIsoYmd={utcDateToHtmlDateInputValue(account.date_opened)}
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
              <label htmlFor="website_url" className="mb-1 block text-xs font-medium text-slate-400">
                Website / URL
              </label>
              <SensitiveTextInput
                obfuscate={obfuscate}
                id="website_url"
                name="website_url"
                value={account.website_url ?? ""}
                className={inputClass}
                placeholder="Optional"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
                Notes
              </label>
              <SensitiveTextarea
                obfuscate={obfuscate}
                id="notes"
                name="notes"
                rows={3}
                value={account.notes ?? ""}
                className={inputClass}
              />
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                {isHebrew ? "שמירת שינויים" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
