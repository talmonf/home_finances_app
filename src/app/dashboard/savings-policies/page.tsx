import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { EntityUrlsPanel } from "@/components/entity-urls-panel";
import { formatHouseholdDate } from "@/lib/household-date-format";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";
import { createSavingsPolicy, toggleSavingsPolicyActive } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    urls?: string;
  }>;
};

function formatMoney(value: unknown, currency: string) {
  if (value == null) return "—";
  const n =
    typeof value === "object" && value !== null && "toString" in value
      ? Number((value as { toString(): string }).toString())
      : Number(value);
  return Number.isNaN(n)
    ? "—"
    : `${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default async function SavingsPoliciesPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [policies, familyMembers, bankAccounts, digitalMethods, householdRow] = await Promise.all([
    prisma.savings_policies.findMany({
      where: { household_id: householdId },
      include: {
        owner: true,
        bank_account: true,
        digital_payment_method: true,
      },
      orderBy: [{ is_active: "desc" }, { created_at: "desc" }],
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { account_name: "asc" },
    }),
    prisma.digital_payment_methods.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { name: "asc" },
    }),
    prisma.households.findFirst({
      where: { id: householdId },
      select: { primary_currency: true },
    }),
  ]);

  const primaryCurrency = householdRow?.primary_currency ?? "ILS";
  const totalBalance = policies
    .filter(
      (p) =>
        p.is_active &&
        p.current_balance != null &&
        p.currency === primaryCurrency,
    )
    .reduce((sum, p) => sum + Number(p.current_balance!.toString()), 0);
  const totalMonthly = policies
    .filter(
      (p) =>
        p.is_active &&
        p.monthly_contribution != null &&
        p.currency === primaryCurrency,
    )
    .reduce((sum, p) => sum + Number(p.monthly_contribution!.toString()), 0);

  const savingsPolicyIds = policies.map((p) => p.id);
  const savingsEntityUrls =
    savingsPolicyIds.length === 0
      ? []
      : await prisma.entity_urls.findMany({
          where: {
            household_id: householdId,
            entity_kind: "savings_policy",
            entity_id: { in: savingsPolicyIds },
          },
          orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        });
  const urlsBySavingsPolicyId = new Map<string, typeof savingsEntityUrls>();
  for (const u of savingsEntityUrls) {
    const list = urlsBySavingsPolicyId.get(u.entity_id) ?? [];
    list.push(u);
    urlsBySavingsPolicyId.set(u.entity_id, list);
  }

  const savingsListRedirect = "/dashboard/savings-policies";

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div>
            <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
              {isHebrew ? "חזרה ללוח הבקרה →" : "← Back to dashboard"}
            </Link>
            <h1 className="text-2xl font-semibold text-slate-50">
              {isHebrew ? "חסכונות ותוכניות חיסכון" : "Savings policies"}
            </h1>
            <p className="text-sm text-slate-400">
              {isHebrew
                ? "מעקב אחר תוכניות חיסכון והשקעה: יתרה, יעד, הפקדה חודשית, מועדי חידוש ופרעון."
                : "Track savings and long-term plans: balance, target, monthly contribution, renewal and maturity dates."}
            </p>
            <p className="text-xs text-slate-500">
              <Link href="/dashboard/insurance-policies" className="text-sky-400 hover:text-sky-300">
                {isHebrew ? "פוליסות ביטוח ←" : "→ Insurance policies"}
              </Link>
            </p>
          </div>
          {(resolvedSearchParams?.created ||
            resolvedSearchParams?.updated ||
            resolvedSearchParams?.error ||
            resolvedSearchParams?.urls === "1") && (
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
                  : resolvedSearchParams?.urls === "1"
                    ? isHebrew
                      ? "קישורים עודכנו."
                      : "Links updated."
                    : resolvedSearchParams?.created
                      ? isHebrew
                        ? "נשמר."
                        : "Savings policy saved."
                      : isHebrew
                        ? "עודכן."
                        : "Updated."}
              </span>
            </div>
          )}
        </header>

        {policies.some((p) => p.is_active) ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <div className="text-xs text-slate-400">
                {isHebrew
                  ? `סה״כ יתרה ב-${primaryCurrency} (פעילים)`
                  : `Total balance in ${primaryCurrency} (active)`}
              </div>
              <div className="mt-1 text-lg font-semibold text-emerald-400 tabular-nums">
                {formatMoney(totalBalance || null, primaryCurrency)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <div className="text-xs text-slate-400">
                {isHebrew
                  ? `סה״כ הפקדה חודשית ב-${primaryCurrency} (פעילים)`
                  : `Total monthly contribution in ${primaryCurrency} (active)`}
              </div>
              <div className="mt-1 text-lg font-semibold text-sky-300 tabular-nums">
                {formatMoney(totalMonthly || null, primaryCurrency)}
              </div>
            </div>
          </div>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "הוספה חדשה" : "Add new"}</h2>
          <form
            action={createSavingsPolicy}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <div>
              <label htmlFor="provider_name" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "ספק / גוף מוסדי" : "Provider / institution"}{" "}
                <span className="text-rose-400">*</span>
              </label>
              <input
                id="provider_name"
                name="provider_name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="policy_name" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "שם התוכנית" : "Plan name"} <span className="text-rose-400">*</span>
              </label>
              <input
                id="policy_name"
                name="policy_name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="policy_number" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "מספר חשבון / פוליסה" : "Account / policy number"}
              </label>
              <input
                id="policy_number"
                name="policy_number"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="owner_family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "בעלים" : "Owner"}
              </label>
              <select
                id="owner_family_member_id"
                name="owner_family_member_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{isHebrew ? "לא הוגדר" : "Not set"}</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="current_balance" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "יתרה נוכחית" : "Current balance"}
              </label>
              <input
                id="current_balance"
                name="current_balance"
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="target_amount" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "יעד" : "Target amount"}
              </label>
              <input
                id="target_amount"
                name="target_amount"
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="monthly_contribution" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "הפקדה חודשית" : "Monthly contribution"}
              </label>
              <input
                id="monthly_contribution"
                name="monthly_contribution"
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="currency" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "מטבע" : "Currency"} <span className="text-rose-400">*</span>
              </label>
              <select
                id="currency"
                name="currency"
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
            <div>
              <label htmlFor="start_date" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "תאריך התחלה" : "Start date"}
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="maturity_date" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "תאריך פרעון" : "Maturity date"}
              </label>
              <input
                id="maturity_date"
                name="maturity_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="renewal_date" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "תאריך חידוש" : "Renewal date"}
              </label>
              <input
                id="renewal_date"
                name="renewal_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="bank_account_id" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "חשבון בנק מקושר" : "Linked bank account"}
              </label>
              <select
                id="bank_account_id"
                name="bank_account_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{isHebrew ? "ללא" : "None"}</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.account_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="digital_payment_method_id" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "אמצעי תשלום דיגיטלי" : "Digital payment method"}
              </label>
              <select
                id="digital_payment_method_id"
                name="digital_payment_method_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{isHebrew ? "ללא" : "None"}</option>
                {digitalMethods.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
                {isHebrew ? "הערות" : "Notes"}
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                {isHebrew ? "הוספה" : "Add"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "רשימה" : "List"}</h2>
          {policies.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              {isHebrew ? "אין עדיין רשומות." : "No savings policies yet."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "ספק / תוכנית" : "Provider / plan"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "בעלים" : "Owner"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "יתרה" : "Balance"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "חודשי" : "Monthly"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "פרעון" : "Maturity"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "חידוש" : "Renewal"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "סטטוס" : "Status"}
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">
                      {isHebrew ? "פעולות" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <Fragment key={p.id}>
                      <tr className="border-b border-slate-700/80 hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-100">
                          <div className="font-medium">{p.provider_name}</div>
                          <div className="text-slate-400">{p.policy_name}</div>
                          {p.policy_number ? (
                            <div className="text-xs text-slate-500">#{p.policy_number}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {p.owner?.full_name ?? (isHebrew ? "משק הבית" : "Household")}
                        </td>
                        <td className="px-4 py-3 text-slate-300 tabular-nums">
                          {formatMoney(p.current_balance, p.currency)}
                        </td>
                        <td className="px-4 py-3 text-slate-300 tabular-nums">
                          {formatMoney(p.monthly_contribution, p.currency)}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {p.maturity_date
                            ? formatHouseholdDate(p.maturity_date, dateDisplayFormat)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {p.renewal_date
                            ? formatHouseholdDate(p.renewal_date, dateDisplayFormat)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={p.is_active ? "text-emerald-400" : "text-slate-500"}>
                            {p.is_active
                              ? isHebrew
                                ? "פעיל"
                                : "Active"
                              : isHebrew
                                ? "לא פעיל"
                                : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <form
                            action={toggleSavingsPolicyActive.bind(null, p.id, !p.is_active)}
                            className="inline"
                          >
                            <button type="submit" className="text-xs font-medium text-sky-400 hover:text-sky-300">
                              {p.is_active
                                ? isHebrew
                                  ? "השבתה"
                                  : "Deactivate"
                                : isHebrew
                                  ? "הפעלה"
                                  : "Activate"}
                            </button>
                          </form>
                        </td>
                      </tr>
                      <tr className="border-b border-slate-700/80 bg-slate-950/30">
                        <td colSpan={8} className="px-4 py-3">
                          <EntityUrlsPanel
                            entityKind="savings_policy"
                            entityId={p.id}
                            redirectTo={savingsListRedirect}
                            urls={urlsBySavingsPolicyId.get(p.id) ?? []}
                            isHebrew={isHebrew}
                          />
                        </td>
                      </tr>
                    </Fragment>
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
