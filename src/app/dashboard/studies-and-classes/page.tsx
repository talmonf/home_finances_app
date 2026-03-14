import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createStudyOrClass, toggleStudyOrClassActive } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    family_member_id?: string;
  }>;
};

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(value: unknown) {
  if (value == null) return "—";
  const n = typeof value === "object" && value !== null && "toNumber" in value
    ? (value as { toNumber(): number }).toNumber()
    : Number(value);
  return Number.isNaN(n) ? "—" : n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function StudiesAndClassesPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const filterFamilyMemberId = resolvedSearchParams?.family_member_id?.trim() || null;

  const [studies, familyMembers] = await Promise.all([
    prisma.studies_and_classes.findMany({
      where: {
        household_id: householdId,
        ...(filterFamilyMemberId ? { family_member_id: filterFamilyMemberId } : {}),
      },
      include: { family_member: true },
      orderBy: [{ start_date: "desc" }, { name: "asc" }],
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href="/"
                className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
              >
                ← Back to dashboard
              </Link>
              <h1 className="text-2xl font-semibold text-slate-50">
                Studies &amp; Classes
              </h1>
              <p className="text-sm text-slate-400">
                Track studies and classes per family member with expected costs.
              </p>
            </div>
          </div>

          {(resolvedSearchParams?.created ||
            resolvedSearchParams?.updated ||
            resolvedSearchParams?.error) && (
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              <span>
                {resolvedSearchParams.error
                  ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                  : resolvedSearchParams.created
                    ? "Study/class added."
                    : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add new</h2>
          <form
            action={createStudyOrClass}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-slate-400">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                placeholder="e.g. Piano lessons"
              />
            </div>
            <div>
              <label htmlFor="type" className="mb-1 block text-xs font-medium text-slate-400">
                Type
              </label>
              <select
                id="type"
                name="type"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="study">Study</option>
                <option value="class">Class</option>
              </select>
            </div>
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
              <label htmlFor="start_date" className="mb-1 block text-xs font-medium text-slate-400">
                Start date
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="mb-1 block text-xs font-medium text-slate-400">
                End date
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="expected_annual_cost" className="mb-1 block text-xs font-medium text-slate-400">
                Expected annual cost
              </label>
              <input
                id="expected_annual_cost"
                name="expected_annual_cost"
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="number_of_years" className="mb-1 block text-xs font-medium text-slate-400">
                Number of years
              </label>
              <input
                id="number_of_years"
                name="number_of_years"
                type="number"
                min="1"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="1"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="mb-1 block text-xs font-medium text-slate-400">
                Description
              </label>
              <input
                id="description"
                name="description"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional notes"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Add study/class
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-medium text-slate-200">List</h2>
            {familyMembers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/studies-and-classes"
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    !filterFamilyMemberId
                      ? "bg-sky-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  All
                </Link>
                {familyMembers.map((m) => (
                  <Link
                    key={m.id}
                    href={`/dashboard/studies-and-classes?family_member_id=${encodeURIComponent(m.id)}`}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      filterFamilyMemberId === m.id
                        ? "bg-sky-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {m.full_name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {studies.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No studies or classes yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Type</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Family member</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Start</th>
                    <th className="px-4 py-3 font-medium text-slate-300">End</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Annual cost</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Years</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studies.map((s) => (
                    <tr key={s.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{s.name}</td>
                      <td className="px-4 py-3 text-slate-300 capitalize">{s.type}</td>
                      <td className="px-4 py-3 text-slate-300">{s.family_member.full_name}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(s.start_date)}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(s.end_date)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatMoney(s.expected_annual_cost)}</td>
                      <td className="px-4 py-3 text-slate-400">{s.number_of_years ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            s.is_active
                              ? "text-emerald-400"
                              : "text-slate-500"
                          }
                        >
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <form
                          action={() => toggleStudyOrClassActive(s.id, !s.is_active)}
                          className="inline"
                        >
                          <button
                            type="submit"
                            className="text-sky-400 hover:text-sky-300 text-xs font-medium"
                          >
                            {s.is_active ? "Deactivate" : "Activate"}
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
