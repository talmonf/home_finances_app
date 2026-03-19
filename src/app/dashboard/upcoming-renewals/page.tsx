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

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
    donationCommitments,
  ] = await Promise.all([
    prisma.subscriptions.findMany({
      where: { household_id: householdId, is_active: true, renewal_date: { gte: today } },
      include: { credit_card: { include: { family_member: true } } },
    }),
    prisma.identities.findMany({
      where: { household_id: householdId, is_active: true, expiry_date: { gte: today } },
      include: { family_member: true },
    }),
    prisma.credit_cards.findMany({
      where: {
        household_id: householdId,
        is_active: true,
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
    prisma.donation_commitments.findMany({
      where: { household_id: householdId, is_active: true, renewal_date: { gte: today } },
      include: { payee: true },
    }),
  ]);

  const rows: RenewalRow[] = [
    ...subscriptions.map((s) => ({
      id: `sub-${s.id}`,
      category: "Subscription",
      itemName: s.name,
      owner: s.credit_card?.family_member?.full_name ?? "Household",
      renewalDate: s.renewal_date,
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
    ...donationCommitments.map((d) => ({
      id: `donation-${d.id}`,
      category: "Donation",
      itemName: d.payee.name,
      owner: "Household",
      renewalDate: d.renewal_date,
      href: "/dashboard/donation-commitments",
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
            All active upcoming renewal and expiration dates across subscriptions, identity, cards,
            insurance, utilities, and donations.
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
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-200">{formatDate(row.renewalDate)}</td>
                    <td className="px-4 py-3 text-slate-300">{row.category}</td>
                    <td className="px-4 py-3 text-slate-100">{row.itemName}</td>
                    <td className="px-4 py-3 text-slate-400">{row.owner}</td>
                    <td className="px-4 py-3">
                      <Link href={row.href} className="text-xs font-medium text-sky-400 hover:text-sky-300">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

