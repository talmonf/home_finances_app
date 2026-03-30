import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { DonationKind } from "@/generated/prisma/enums";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createDonation, toggleDonationActive } from "./actions";
import { DonationForm } from "./DonationForm";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

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

export default async function DonationsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [rows, payees] = await Promise.all([
    prisma.donations.findMany({
      where: { household_id: householdId },
      include: { payee: true },
      orderBy: [{ created_at: "desc" }],
    }),
    prisma.payees.findMany({
      where: { household_id: householdId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div>
            <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
              ← Back to dashboard
            </Link>
            <h1 className="text-2xl font-semibold text-slate-50">Donations</h1>
            <p className="text-sm text-slate-400">
              Record one-time gifts and monthly commitments, with organization details for tax (Seif 46)
              tracking. Set an optional renewal date to include the entry on Upcoming renewals.
            </p>
          </div>

          {(resolvedSearchParams?.created ||
            resolvedSearchParams?.updated ||
            resolvedSearchParams?.error) && (
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
                  : resolvedSearchParams?.created
                    ? "Donation saved."
                    : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add donation</h2>
          <DonationForm action={createDonation} payees={payees.map((p) => ({ id: p.id, name: p.name }))} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Recorded donations</h2>
          {rows.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No donations yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Type</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Organization</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Amount</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Tax / Seif 46</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Contact</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Renewal</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Notes</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => {
                    const amountSummary =
                      d.kind === DonationKind.one_time
                        ? `${formatMoney(d.one_time_amount)} ${d.currency} on ${formatDate(d.donation_date)}`
                        : `${formatMoney(d.monthly_amount)} ${d.currency}/mo × ${d.commitment_months ?? "—"} mo${
                            d.commitment_start_date
                              ? ` (from ${formatDate(d.commitment_start_date)})`
                              : ""
                          }`;
                    return (
                      <tr key={d.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-300">
                          {d.kind === DonationKind.one_time ? "One-time" : "Monthly commitment"}
                        </td>
                        <td className="px-4 py-3 text-slate-100">
                          {d.organization_name}
                          {d.payee ? (
                            <span className="block text-xs text-slate-500">Payee: {d.payee.name}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{amountSummary}</td>
                        <td className="px-4 py-3 text-slate-400">
                          <div>{d.organization_tax_number ?? "—"}</div>
                          <div className="text-xs text-slate-500">
                            {d.provides_seif_46_receipts ? "Seif 46 receipts" : "No Seif 46"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          <div>{d.organization_phone ?? "—"}</div>
                          <div className="text-xs">{d.organization_email ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{formatDate(d.renewal_date)}</td>
                        <td className="max-w-[12rem] truncate px-4 py-3 text-slate-500" title={d.notes ?? undefined}>
                          {d.notes ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={d.is_active ? "text-emerald-400" : "text-slate-500"}>
                            {d.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <form
                            action={toggleDonationActive.bind(null, d.id, !d.is_active)}
                            className="inline"
                          >
                            <button
                              type="submit"
                              className="text-xs font-medium text-sky-400 hover:text-sky-300"
                            >
                              {d.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
