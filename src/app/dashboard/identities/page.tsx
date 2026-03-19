import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createIdentity, toggleIdentityActive } from "./actions";

export const dynamic = "force-dynamic";

const IDENTITY_TYPE_LABELS: Record<string, string> = {
  passport: "Passport",
  national_id: "National ID",
  driver_license: "Driver license",
  car_license: "Car license",
  other: "Other",
};

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

export default async function IdentitiesPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [identities, familyMembers] = await Promise.all([
    prisma.identities.findMany({
      where: { household_id: householdId },
      include: { family_member: true },
      orderBy: { expiry_date: "asc" },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
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
            <h1 className="text-2xl font-semibold text-slate-50">Identity</h1>
            <p className="text-sm text-slate-400">
              Track family identity items such as passports, IDs, and licenses.
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
                    ? "Identity item added."
                    : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add new</h2>
          <form
            action={createIdentity}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div>
              <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
                Family member
              </label>
              <select
                id="family_member_id"
                name="family_member_id"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Select…</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="identity_type" className="mb-1 block text-xs font-medium text-slate-400">
                Type
              </label>
              <select
                id="identity_type"
                name="identity_type"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue="passport"
              >
                {Object.entries(IDENTITY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="identifier" className="mb-1 block text-xs font-medium text-slate-400">
                Identifier (optional)
              </label>
              <input
                id="identifier"
                name="identifier"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. passport number"
              />
            </div>
            <div>
              <label htmlFor="expiry_date" className="mb-1 block text-xs font-medium text-slate-400">
                Expiry date
              </label>
              <input
                id="expiry_date"
                name="expiry_date"
                type="date"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Add identity item
              </button>
            </div>
          </form>
          {familyMembers.length === 0 && (
            <p className="text-xs text-amber-400">
              Add at least one family member before creating identity items.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">List</h2>
          {identities.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No identity items yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Family member</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Type</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Identifier</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Expiry date</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {identities.map((i) => (
                    <tr key={i.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{i.family_member.full_name}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {IDENTITY_TYPE_LABELS[i.identity_type] ?? i.identity_type}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{i.identifier ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(i.expiry_date)}</td>
                      <td className="px-4 py-3">
                        <span className={i.is_active ? "text-emerald-400" : "text-slate-500"}>
                          {i.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <form action={() => toggleIdentityActive(i.id, !i.is_active)} className="inline">
                          <button type="submit" className="text-xs font-medium text-sky-400 hover:text-sky-300">
                            {i.is_active ? "Deactivate" : "Activate"}
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

