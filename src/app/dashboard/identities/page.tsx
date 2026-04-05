import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createIdentity } from "./actions";

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
    sort?: string;
    dir?: string;
    family_member_id?: string;
    identity_type?: string;
  }>;
};

export default async function IdentitiesPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const sort = resolvedSearchParams?.sort ?? "expiry_date";
  const dir = resolvedSearchParams?.dir === "desc" ? "desc" : "asc";

  const sortKeys = ["family_member", "identity_type", "identity_type_other", "identifier", "expiry_date"] as const;
  type SortKey = (typeof sortKeys)[number];
  const activeSortKey = (sortKeys.includes(sort as SortKey) ? (sort as SortKey) : "expiry_date") as SortKey;

  const filterFamilyMemberId =
    resolvedSearchParams?.family_member_id &&
    resolvedSearchParams.family_member_id !== "all"
      ? resolvedSearchParams.family_member_id
      : null;

  const IDENTITY_TYPE_FILTER_VALUES = ["passport", "national_id", "driver_license", "other"] as const;
  type IdentityTypeFilter = (typeof IDENTITY_TYPE_FILTER_VALUES)[number];
  const filterIdentityType = (() => {
    const v = resolvedSearchParams?.identity_type;
    if (!v || v === "all") return null;
    const asStringArray = IDENTITY_TYPE_FILTER_VALUES as readonly string[];
    return asStringArray.includes(v) ? (v as IdentityTypeFilter) : null;
  })();

  const nextDirFor = (key: SortKey) => {
    if (activeSortKey !== key) return "asc";
    return dir === "asc" ? "desc" : "asc";
  };

  const editListContextQuery = (() => {
    const q = new URLSearchParams();
    if (filterFamilyMemberId) q.set("family_member_id", filterFamilyMemberId);
    if (filterIdentityType) q.set("identity_type", filterIdentityType);
    q.set("sort", activeSortKey);
    q.set("dir", dir);
    return q.toString();
  })();

  const [identities, familyMembers] = await Promise.all([
    prisma.identities.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        ...(filterFamilyMemberId ? { family_member_id: filterFamilyMemberId } : {}),
        ...(filterIdentityType ? { identity_type: filterIdentityType } : {}),
      },
      include: { family_member: true },
    }),
    prisma.family_members.findMany({
      where: filterFamilyMemberId
        ? { household_id: householdId, OR: [{ is_active: true }, { id: filterFamilyMemberId }] }
        : { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  const sortedIdentities = identities
    .slice()
    .sort((a, b) => {
      const multiplier = dir === "asc" ? 1 : -1;
      if (activeSortKey === "expiry_date") {
        return multiplier * (a.expiry_date.getTime() - b.expiry_date.getTime());
      }

      if (activeSortKey === "family_member") {
        return multiplier * a.family_member.full_name.localeCompare(b.family_member.full_name);
      }

      if (activeSortKey === "identity_type") {
        return multiplier * a.identity_type.localeCompare(b.identity_type);
      }

      if (activeSortKey === "identity_type_other") {
        const left = a.identity_type_other ?? "";
        const right = b.identity_type_other ?? "";
        return multiplier * left.localeCompare(right);
      }

      // identifier
      const left = a.identifier ?? "";
      const right = b.identifier ?? "";
      return multiplier * left.localeCompare(right);
    });

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
          <h2 className="text-lg font-medium text-slate-200">Filters</h2>
          <form method="get" className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="family_member_id_filter" className="mb-1 block text-xs font-medium text-slate-400">
                Family Member
              </label>
              <select
                id="family_member_id_filter"
                name="family_member_id"
                defaultValue={filterFamilyMemberId ?? "all"}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="all">All</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="identity_type_filter" className="mb-1 block text-xs font-medium text-slate-400">
                Document Type
              </label>
              <select
                id="identity_type_filter"
                name="identity_type"
                defaultValue={filterIdentityType ?? "all"}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="all">All</option>
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="driver_license">Driver license</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex items-end">
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="dir" value={dir} />
              <button
                type="submit"
                className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Apply filters
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add new</h2>
          <form
            action={createIdentity}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input type="hidden" name="redirect_family_member_id" value={filterFamilyMemberId ?? "all"} />
            <input type="hidden" name="redirect_identity_type" value={filterIdentityType ?? "all"} />
            <input type="hidden" name="redirect_sort" value={activeSortKey} />
            <input type="hidden" name="redirect_dir" value={dir} />
            <div>
              <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
                Family member
              </label>
              <select
                id="family_member_id"
                name="family_member_id"
                required
                defaultValue={filterFamilyMemberId ?? ""}
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
                defaultValue={filterIdentityType ?? "passport"}
              >
                {Object.entries(IDENTITY_TYPE_LABELS)
                  .filter(([value]) => value !== "car_license")
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="identity_type_other"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Other type (specify)
              </label>
              <input
                id="identity_type_other"
                name="identity_type_other"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Required only when Type is Other"
              />
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
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
                Notes (optional)
              </label>
              <input
                id="notes"
                name="notes"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional notes"
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
          {sortedIdentities.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No identity items yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    {(
                      [
                        { key: "family_member" as const, label: "Family member" },
                        { key: "identity_type" as const, label: "Type" },
                        { key: "identity_type_other" as const, label: "Additional Info" },
                        { key: "identifier" as const, label: "Identifier" },
                        { key: "expiry_date" as const, label: "Expiry date" },
                      ] as const
                    ).map((col) => {
                      const isActive = activeSortKey === col.key;
                      const arrow = !isActive ? "" : dir === "asc" ? "↑" : "↓";
                      const query = new URLSearchParams();
                      if (resolvedSearchParams?.created) query.set("created", resolvedSearchParams.created);
                      if (resolvedSearchParams?.updated) query.set("updated", resolvedSearchParams.updated);
                      if (resolvedSearchParams?.error) query.set("error", resolvedSearchParams.error);
                      if (filterFamilyMemberId) query.set("family_member_id", filterFamilyMemberId);
                      if (filterIdentityType) query.set("identity_type", filterIdentityType);
                      query.set("sort", col.key);
                      query.set("dir", nextDirFor(col.key));
                      const href = `/dashboard/identities?${query.toString()}`;

                      return (
                        <th key={col.key} className="px-4 py-3 font-medium text-slate-300">
                          <Link
                            href={href}
                            className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-slate-300 hover:text-sky-300"
                          >
                            <span>{col.label}</span>
                            {arrow && <span>{arrow}</span>}
                          </Link>
                        </th>
                      );
                    })}
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedIdentities.map((i) => (
                    <tr key={i.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{i.family_member.full_name}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {i.identity_type === "other"
                          ? "Other"
                          : IDENTITY_TYPE_LABELS[i.identity_type] ?? i.identity_type}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {i.identity_type_other ?? ""}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <div>{i.identifier ?? ""}</div>
                        {i.notes ? (
                          <div className="mt-1 text-xs text-slate-500">{i.notes}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                      {formatHouseholdDate(i.expiry_date, dateDisplayFormat)}
                    </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/identities/${i.id}?${editListContextQuery}`}
                          className="text-xs font-medium text-sky-400 hover:text-sky-300"
                        >
                          Edit
                        </Link>
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

