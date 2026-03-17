import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createProperty, togglePropertyPrimary } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

function formatAddress(p: {
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  postal_code?: string | null;
  country: string;
}) {
  const parts = [p.address_line_1];
  if (p.address_line_2) parts.push(p.address_line_2);
  parts.push([p.city, p.postal_code].filter(Boolean).join(" "), p.country);
  return parts.filter(Boolean).join(", ");
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const properties = await prisma.properties.findMany({
    where: { household_id: householdId },
    include: { _count: { select: { utilities: true } } },
    orderBy: [{ is_primary_residence: "desc" }, { name: "asc" }],
  });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Homes &amp; properties</h1>
          <p className="text-sm text-slate-400">
            Define homes or apartments the household owns or lives in, and the utility companies that service them.
          </p>
          {(resolvedSearchParams?.created ||
            resolvedSearchParams?.updated ||
            resolvedSearchParams?.error) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              {resolvedSearchParams.error
                ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                : resolvedSearchParams.created
                  ? "Property added."
                  : "Updated."}
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add new</h2>
          <form
            action={createProperty}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-slate-400">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. Main home"
              />
            </div>
            <div>
              <label htmlFor="ownership_type" className="mb-1 block text-xs font-medium text-slate-400">
                Ownership
              </label>
              <select
                id="ownership_type"
                name="ownership_type"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="owned">Owned</option>
                <option value="rental">Rental</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="owner_name" className="mb-1 block text-xs font-medium text-slate-400">
                In whose name
              </label>
              <input
                id="owner_name"
                name="owner_name"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_primary_residence"
                  className="rounded border-slate-600 bg-slate-800 text-sky-500"
                />
                <span className="text-sm text-slate-300">Primary residence</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address_line_1" className="mb-1 block text-xs font-medium text-slate-400">
                Address line 1
              </label>
              <input
                id="address_line_1"
                name="address_line_1"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Street and number"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address_line_2" className="mb-1 block text-xs font-medium text-slate-400">
                Address line 2
              </label>
              <input
                id="address_line_2"
                name="address_line_2"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>
            <div>
              <label htmlFor="city" className="mb-1 block text-xs font-medium text-slate-400">
                City
              </label>
              <input
                id="city"
                name="city"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="postal_code" className="mb-1 block text-xs font-medium text-slate-400">
                Postal code
              </label>
              <input
                id="postal_code"
                name="postal_code"
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
            <div>
              <label htmlFor="phone" className="mb-1 block text-xs font-medium text-slate-400">
                Phone (optional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. +1 234 567 8900"
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Add property
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">List</h2>
          {properties.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No properties yet. Add one above, then open it to add utility companies.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Address</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Ownership</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Owner name</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Primary</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Utilities</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => (
                    <tr key={p.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{p.name}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-400" title={formatAddress(p)}>
                        {formatAddress(p)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 capitalize">{p.ownership_type}</td>
                      <td className="px-4 py-3 text-slate-400">{p.owner_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        {p.is_primary_residence ? (
                          <span className="text-emerald-400">Primary home</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{p._count.utilities}</td>
                      <td className="px-4 py-3 space-x-3">
                        <Link
                          href={`/dashboard/properties/${p.id}`}
                          className="text-xs font-medium text-sky-400 hover:text-sky-300"
                        >
                          Edit
                        </Link>
                        {!p.is_primary_residence && (
                          <form action={togglePropertyPrimary.bind(null, p.id)} className="inline">
                            <button type="submit" className="text-xs font-medium text-slate-400 hover:text-slate-200">
                              Set as primary
                            </button>
                          </form>
                        )}
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
