import {
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import {
  computeUpcomingRenewals,
  dateOnlyLocal,
  fetchFamilyMembersForHousehold,
  RENEWAL_CATEGORY_ORDER,
  startOfToday,
  type RenewalRow,
} from "@/lib/upcoming-renewals/compute";
import { overdueLabelForCategory } from "@/lib/upcoming-renewals/overdue-labels";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    category?: string;
    owner?: string;
  }>;
};

export default async function UpcomingRenewalsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const today = startOfToday();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const categoryFilter = resolvedSearchParams?.category ?? "all";
  const ownerFilter = resolvedSearchParams?.owner ?? "all";

  const [rows, familyMembers] = await Promise.all([
    computeUpcomingRenewals({
      householdId,
      today,
      language: isHebrew ? "he" : "en",
    }),
    fetchFamilyMembersForHousehold(householdId),
  ]);

  const effectiveCategoryFilter =
    categoryFilter === "all" || rows.some((r: RenewalRow) => r.category === categoryFilter)
      ? categoryFilter
      : "all";
  const familyMemberIdSet = new Set(familyMembers.map((m) => m.id));
  const effectiveOwnerFilter =
    ownerFilter === "all" || familyMemberIdSet.has(ownerFilter) ? ownerFilter : "all";

  const filteredRows = rows.filter((r) => {
    const categoryOk = effectiveCategoryFilter === "all" ? true : r.category === effectiveCategoryFilter;
    const ownerOk = effectiveOwnerFilter === "all" ? true : r.ownerId === effectiveOwnerFilter;
    return categoryOk && ownerOk;
  });

  const categoryOrder = [...RENEWAL_CATEGORY_ORDER];
  const categories = Array.from(new Set(rows.map((r) => r.category))).sort((a, b) => {
    const ia = categoryOrder.indexOf(a as (typeof categoryOrder)[number]);
    const ib = categoryOrder.indexOf(b as (typeof categoryOrder)[number]);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-3">
      <div className="w-full max-w-screen-2xl space-y-4 rounded-2xl bg-slate-900 p-6 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              <label htmlFor="category" className="mb-0.5 text-xs font-medium text-slate-400">
                {isHebrew ? "קטגוריה" : "Category"}
              </label>
              <select
                id="category"
                name="category"
                defaultValue={effectiveCategoryFilter}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
              >
                <option value="all">{isHebrew ? "הכל" : "All"}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="owner" className="mb-0.5 text-xs font-medium text-slate-400">
                {isHebrew ? "בעלים (= בן משפחה)" : "Owner (= Family Member)"}
              </label>
              <select
                id="owner"
                name="owner"
                defaultValue={effectiveOwnerFilter}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
              >
                <option value="all">{isHebrew ? "הכל" : "All"}</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-500"
            >
              {isHebrew ? "החל" : "Apply"}
            </button>
          </form>
          <Link
            href="/dashboard/upcoming-renewals/email-settings"
            className="text-sm font-medium text-sky-400 hover:text-sky-300"
          >
            {isHebrew ? "הגדרות אימייל" : "Email digest settings"}
          </Link>
        </div>

        {filteredRows.length === 0 ? (
          <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
            No upcoming renewals found.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-4 py-3 font-medium text-slate-300">Date</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Category</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Renewal Type</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Item</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Owner / Context</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Manage</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const isPassed = dateOnlyLocal(row.renewalDate) < today;
                  const overdue = isPassed;
                  const overdueLabel = overdueLabelForCategory(row.category, isHebrew);
                  return (
                    <tr key={row.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td
                        className={`px-4 py-3 ${overdue ? "text-rose-300" : "text-slate-200"}`}
                        title={overdue ? "Renewal date has passed" : undefined}
                      >
                        {formatHouseholdDate(row.renewalDate, dateDisplayFormat)}
                        {overdue ? (
                          <span className="ms-2 text-xs font-medium text-rose-400/90">{overdueLabel}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.category}</td>
                      <td className="px-4 py-3 text-slate-300">{row.renewalType}</td>
                      <td className="px-4 py-3 text-slate-100">{row.itemName}</td>
                      <td className="px-4 py-3 text-slate-400">{row.owner}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={row.href}
                          className="text-xs font-medium text-sky-400 hover:text-sky-300"
                        >
                          {isHebrew ? "פתח" : "Open"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
