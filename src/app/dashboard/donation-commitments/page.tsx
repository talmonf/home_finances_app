import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createDonationCommitment, toggleDonationCommitmentActive } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DonationCommitmentsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [commitments, charityPayees, allPayees] = await Promise.all([
    prisma.donation_commitments.findMany({
      where: { household_id: householdId },
      include: { payee: true },
      orderBy: { renewal_date: "asc" },
    }),
    prisma.payees.findMany({
      where: { household_id: householdId, is_charity: true },
      orderBy: { name: "asc" },
    }),
    prisma.payees.findMany({
      where: { household_id: householdId },
      orderBy: { name: "asc" },
    }),
  ]);

  const payees = charityPayees.length > 0 ? charityPayees : allPayees;

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div>
            <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
              ← Back to dashboard
            </Link>
            <h1 className="text-2xl font-semibold text-slate-50">Donation commitments</h1>
            <p className="text-sm text-slate-400">Track annual donation renewals per charity.</p>
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
                    ? "Donation commitment added."
                    : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add new</h2>
          <form
            action={createDonationCommitment}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="sm:col-span-2">
              <label htmlFor="payee_id" className="mb-1 block text-xs font-medium text-slate-400">
                Charity
              </label>
              <select
                id="payee_id"
                name="payee_id"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Select…</option>
                {payees.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {charityPayees.length === 0 && (
                <p className="mt-1 text-xs text-amber-400">
                  No payees are marked as charity yet. Showing all payees.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="renewal_date" className="mb-1 block text-xs font-medium text-slate-400">
                Renewal date
              </label>
              <input
                id="renewal_date"
                name="renewal_date"
                type="date"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
                Notes (optional)
              </label>
              <input
                id="notes"
                name="notes"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Add commitment
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">List</h2>
          {commitments.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No donation commitments yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Charity</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Renewal date</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Notes</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {commitments.map((c) => (
                    <tr key={c.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{c.payee.name}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(c.renewal_date)}</td>
                      <td className="px-4 py-3 text-slate-400">{c.notes ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={c.is_active ? "text-emerald-400" : "text-slate-500"}>
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <form
                          action={toggleDonationCommitmentActive.bind(null, c.id, !c.is_active)}
                          className="inline"
                        >
                          <button type="submit" className="text-xs font-medium text-sky-400 hover:text-sky-300">
                            {c.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </td>
                    </tr>
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

