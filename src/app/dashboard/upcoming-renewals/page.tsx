import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type RenewalRow = {
  id: string;
  category: string;
  itemName: string;
  owner: string;
  ownerId: string | null;
  renewalDate: Date;
  renewalType: string;
  href: string;
};

const PURCHASE_CATEGORY_LABELS: Record<string, string> = {
  electronics: "Electronics",
  appliances: "Appliances",
  tools: "Tools",
  other: "Other",
};

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dateOnlyLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getDaysInMonth(year: number, monthZeroBased: number) {
  return new Date(year, monthZeroBased + 1, 0).getDate();
}

function nextMonthlyRenewal(dayOfMonth: number, baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const thisMonthDay = Math.min(dayOfMonth, getDaysInMonth(year, month));
  const candidateThisMonth = new Date(year, month, thisMonthDay);
  if (candidateThisMonth >= baseDate) {
    return candidateThisMonth;
  }
  const nextMonthDate = new Date(year, month + 1, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();
  const nextMonthDay = Math.min(dayOfMonth, getDaysInMonth(nextYear, nextMonth));
  return new Date(nextYear, nextMonth, nextMonthDay);
}

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

  const today = startOfToday();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const categoryFilter = resolvedSearchParams?.category ?? "all";
  const ownerFilter = resolvedSearchParams?.owner ?? "all";

  const [
    subscriptions,
    identities,
    creditCards,
    insurancePolicies,
    utilities,
    donationRenewals,
    significantPurchases,
    familyMembers,
  ] = await Promise.all([
    prisma.subscriptions.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        OR: [
          { billing_interval: "monthly", monthly_day_of_month: { not: null } },
          { billing_interval: "annual", renewal_date: { not: null } },
        ],
      },
      include: { credit_card: { include: { family_member: true } }, family_member: true },
    }),
    prisma.identities.findMany({
      where: { household_id: householdId, is_active: true, expiry_date: { gte: today } },
      include: { family_member: true },
    }),
    prisma.credit_cards.findMany({
      where: {
        household_id: householdId,
        cancelled_at: null,
        expiry_date: { not: null, gte: today },
      },
      include: { family_member: true },
    }),
    prisma.insurance_policies.findMany({
      where: { household_id: householdId, is_active: true, expiration_date: { gte: today } },
      include: { family_member: true },
    }),
    prisma.property_utilities.findMany({
      where: { household_id: householdId, renewal_date: { not: null, gte: today } },
      include: { property: true },
    }),
    prisma.donations.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        renewal_date: { not: null },
      },
      include: { payee: true, family_member: true },
    }),
    prisma.significant_purchases.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        warranty_expiry_date: { not: null, gte: today },
      },
      include: { family_member: true, credit_card: { include: { family_member: true } } },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      select: { id: true, full_name: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  const rows: RenewalRow[] = [
    ...subscriptions.map((s) => ({
      id: `sub-${s.id}`,
      category: "Subscription",
      itemName: s.name,
      owner: s.family_member?.full_name ?? s.credit_card?.family_member?.full_name ?? "Household",
      ownerId: s.family_member?.id ?? s.credit_card?.family_member?.id ?? null,
      renewalDate:
        s.billing_interval === "monthly" && s.monthly_day_of_month
          ? nextMonthlyRenewal(s.monthly_day_of_month, today)
          : (s.renewal_date as Date),
      renewalType: s.billing_interval === "monthly" ? "Monthly" : "Annual",
      href: `/dashboard/subscriptions/${encodeURIComponent(s.id)}`,
    })),
    ...identities.map((i) => ({
      id: `identity-${i.id}`,
      category: "Identity",
      itemName:
        (() => {
          const other = i.identity_type_other?.trim() || null;
          const typeLabel =
            i.identity_type === "other" ? "Other" : i.identity_type.replaceAll("_", " ");
          return other ? `${typeLabel} - ${other}` : typeLabel;
        })(),
      owner: i.family_member.full_name,
      ownerId: i.family_member.id,
      renewalDate: i.expiry_date,
      renewalType: "—",
      href: `/dashboard/identities/${i.id}`,
    })),
    ...creditCards
      .filter((c) => c.expiry_date)
      .map((c) => ({
        id: `card-${c.id}`,
        category: "Credit card",
        itemName: c.card_name,
        owner: c.family_member.full_name,
        ownerId: c.family_member.id,
        renewalDate: c.expiry_date as Date,
        renewalType: "—",
        href: "/dashboard/credit-cards",
      })),
    ...insurancePolicies.map((p) => ({
      id: `insurance-${p.id}`,
      category: "Insurance",
      itemName: `${p.provider_name} — ${p.policy_name}`,
      owner: p.family_member?.full_name ?? "Household",
      ownerId: p.family_member?.id ?? null,
      renewalDate: p.expiration_date,
      renewalType: "—",
      href: "/dashboard/insurance-policies",
    })),
    ...utilities
      .filter((u) => u.renewal_date)
      .map((u) => ({
        id: `utility-${u.id}`,
        category: "Utility",
        itemName: `${u.provider_name} (${u.utility_type})`,
        owner: u.property.name,
        ownerId: null,
        renewalDate: u.renewal_date as Date,
        renewalType: "—",
        href: `/dashboard/properties/${u.property_id}`,
      })),
    ...donationRenewals.map((d) => ({
      id: `donation-${d.id}`,
      category: "Donation",
      itemName: `${d.organization_name} (${d.category})`,
      owner: d.family_member ? d.family_member.full_name : "Household",
      ownerId: d.family_member?.id ?? null,
      renewalDate: d.renewal_date as Date,
      renewalType: "—",
      href: `/dashboard/donations/${d.id}`,
    })),
    ...significantPurchases.map((p) => ({
      id: `purchase-${p.id}`,
      category: "Warranty",
      itemName: `${PURCHASE_CATEGORY_LABELS[p.purchase_category] ?? p.purchase_category} — ${p.item_name}`,
      owner: p.family_member?.full_name ?? p.credit_card?.family_member?.full_name ?? "Household",
      ownerId: p.family_member?.id ?? p.credit_card?.family_member?.id ?? null,
      renewalDate: p.warranty_expiry_date as Date,
      renewalType: "—",
      href: "/dashboard/significant-purchases",
    })),
  ].sort((a, b) => a.renewalDate.getTime() - b.renewalDate.getTime());

  const effectiveCategoryFilter =
    categoryFilter === "all" || rows.some((r) => r.category === categoryFilter)
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

  const categoryOrder = ["Subscription", "Identity", "Credit card", "Insurance", "Utility", "Donation", "Warranty"];
  const categories = Array.from(
    new Set(rows.map((r) => r.category)),
  ).sort((a, b) => {
    const ia = categoryOrder.indexOf(a);
    const ib = categoryOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Upcoming Renewals</h1>
          <p className="text-sm text-slate-400">
            Renewal and expiration dates across subscriptions (including past subscription renewal
            dates you may have missed), identity, cards, insurance, utilities, donations, and
            warranty-bearing significant purchases.
          </p>
        </header>

        <form method="get" className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col">
            <label htmlFor="category" className="mb-1 text-xs font-medium text-slate-400">
              Category
            </label>
            <select
              id="category"
              name="category"
              defaultValue={effectiveCategoryFilter}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="all">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="owner" className="mb-1 text-xs font-medium text-slate-400">
              Owner (= Family Member)
            </label>
            <select
              id="owner"
              name="owner"
              defaultValue={effectiveOwnerFilter}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="all">All</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Apply
          </button>
        </form>

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
                  const isDonation = row.category === "Donation";
                  const isSubscription = row.category === "Subscription";
                  const overdue = (isSubscription || isDonation) && isPassed;
                  return (
                  <tr key={row.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                    <td
                      className={`px-4 py-3 ${
                        overdue ? "text-rose-300" : "text-slate-200"
                      }`}
                      title={overdue ? "Renewal date has passed" : undefined}
                    >
                      {formatDate(row.renewalDate)}
                      {overdue ? (
                        <span className="ml-2 text-xs font-medium text-rose-400/90">
                          {isDonation ? "Passed" : "Overdue"}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.category}</td>
                    <td className="px-4 py-3 text-slate-300">{row.renewalType}</td>
                    <td className="px-4 py-3 text-slate-100">{row.itemName}</td>
                    <td className="px-4 py-3 text-slate-400">{row.owner}</td>
                    <td className="px-4 py-3">
                      <Link href={row.href} className="text-xs font-medium text-sky-400 hover:text-sky-300">
                        Open
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

