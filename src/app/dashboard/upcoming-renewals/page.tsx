import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type RenewalRow = {
  id: string;
  category: string;
  itemName: string;
  owner: string;
  renewalDate: Date;
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

export default async function UpcomingRenewalsPage() {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const today = startOfToday();

  const [
    subscriptions,
    identities,
    creditCards,
    insurancePolicies,
    utilities,
    donationRenewals,
    significantPurchases,
  ] = await Promise.all([
    prisma.subscriptions.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        renewal_date: { not: null },
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
  ]);

  const rows: RenewalRow[] = [
    ...subscriptions.map((s) => ({
      id: `sub-${s.id}`,
      category: "Subscription",
      itemName: s.name,
      owner: s.family_member?.full_name ?? s.credit_card?.family_member?.full_name ?? "Household",
      renewalDate: s.renewal_date as Date,
      href: "/dashboard/subscriptions",
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
      renewalDate: i.expiry_date,
      href: `/dashboard/identities/${i.id}`,
    })),
    ...creditCards
      .filter((c) => c.expiry_date)
      .map((c) => ({
        id: `card-${c.id}`,
        category: "Credit card",
        itemName: c.card_name,
        owner: c.family_member.full_name,
        renewalDate: c.expiry_date as Date,
        href: "/dashboard/credit-cards",
      })),
    ...insurancePolicies.map((p) => ({
      id: `insurance-${p.id}`,
      category: "Insurance",
      itemName: `${p.provider_name} — ${p.policy_name}`,
      owner: p.family_member?.full_name ?? "Household",
      renewalDate: p.expiration_date,
      href: "/dashboard/insurance-policies",
    })),
    ...utilities
      .filter((u) => u.renewal_date)
      .map((u) => ({
        id: `utility-${u.id}`,
        category: "Utility",
        itemName: `${u.provider_name} (${u.utility_type})`,
        owner: u.property.name,
        renewalDate: u.renewal_date as Date,
        href: `/dashboard/properties/${u.property_id}`,
      })),
    ...donationRenewals.map((d) => ({
      id: `donation-${d.id}`,
      category: "Donation",
      itemName: `${d.organization_name} (${d.category})`,
      owner: d.family_member ? d.family_member.full_name : "Household",
      renewalDate: d.renewal_date as Date,
      href: `/dashboard/donations/${d.id}`,
    })),
    ...significantPurchases.map((p) => ({
      id: `purchase-${p.id}`,
      category: "Warranty",
      itemName: `${PURCHASE_CATEGORY_LABELS[p.purchase_category] ?? p.purchase_category} — ${p.item_name}`,
      owner: p.family_member?.full_name ?? p.credit_card?.family_member?.full_name ?? "Household",
      renewalDate: p.warranty_expiry_date as Date,
      href: "/dashboard/significant-purchases",
    })),
  ].sort((a, b) => a.renewalDate.getTime() - b.renewalDate.getTime());

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

        {rows.length === 0 ? (
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
                  <th className="px-4 py-3 font-medium text-slate-300">Item</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Owner / Context</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Manage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
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

