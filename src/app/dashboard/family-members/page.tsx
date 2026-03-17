import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createFamilyMember, toggleFamilyMemberActive } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    sort?: string;
    dir?: string;
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

export default async function FamilyMembersPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const sort = resolvedSearchParams?.sort ?? "name";
  const dir: Prisma.SortOrder = resolvedSearchParams?.dir === "desc" ? "desc" : "asc";

  // Map UI sort keys to Prisma column names
  const orderBy: Prisma.family_membersOrderByWithRelationInput =
    sort === "relationship"
      ? { relationship: dir }
      : sort === "dob"
        ? { date_of_birth: dir }
        : sort === "id_number"
          ? { id_number: dir }
          : sort === "phone"
            ? { phone: dir }
            : sort === "email"
              ? { email: dir }
              : sort === "status"
                ? { is_active: dir }
                : { full_name: dir };

  const [members, householdUsers] = await Promise.all([
    prisma.family_members.findMany({
      where: { household_id: householdId },
      include: { users: true },
      orderBy,
    }),
    prisma.users.findMany({
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
                Family members
              </h1>
              <p className="text-sm text-slate-400">Manage people in your household.</p>
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
                    ? "Family member added."
                    : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add new</h2>
          <form
            action={createFamilyMember}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="sm:col-span-2">
              <label htmlFor="full_name" className="mb-1 block text-xs font-medium text-slate-400">
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div>
              <label htmlFor="date_of_birth" className="mb-1 block text-xs font-medium text-slate-400">
                Date of birth
              </label>
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="id_number" className="mb-1 block text-xs font-medium text-slate-400">
                ID number
              </label>
              <input
                id="id_number"
                name="id_number"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block text-xs font-medium text-slate-400">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. +1 234 567 8900"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-slate-400">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>
            <div>
              <label htmlFor="relationship" className="mb-1 block text-xs font-medium text-slate-400">
                Relationship
              </label>
              <select
                id="relationship"
                name="relationship"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">—</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Grandson">Grandson</option>
                <option value="Granddaughter">Granddaughter</option>
                <option value="Wife">Wife</option>
                <option value="Husband">Husband</option>
                <option value="Partner">Partner</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="user_id" className="mb-1 block text-xs font-medium text-slate-400">
                Linked user (optional)
              </label>
              <select
                id="user_id"
                name="user_id"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">— None —</option>
                {householdUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Add family member
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">List</h2>
          {members.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No family members yet. Add one above to use in Studies &amp; Classes or Credit cards.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    {[
                      { key: "name", label: "Name" },
                      { key: "relationship", label: "Relationship" },
                      { key: "dob", label: "Date of birth" },
                      { key: "id_number", label: "ID number" },
                      { key: "phone", label: "Phone" },
                      { key: "email", label: "Email" },
                      { key: "status", label: "Status" },
                    ].map((col) => {
                      const isActive = sort === col.key;
                      const nextDir = isActive && dir === "asc" ? "desc" : "asc";
                      const arrow = !isActive ? "" : dir === "asc" ? "↑" : "↓";
                      const query = new URLSearchParams();
                      if (resolvedSearchParams?.created) query.set("created", resolvedSearchParams.created);
                      if (resolvedSearchParams?.updated) query.set("updated", resolvedSearchParams.updated);
                      if (resolvedSearchParams?.error) query.set("error", resolvedSearchParams.error);
                      query.set("sort", col.key);
                      query.set("dir", nextDir);
                      const href = `/dashboard/family-members?${query.toString()}`;

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
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-100">{m.full_name}</td>
                      <td className="px-4 py-3 text-slate-400">{m.relationship ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(m.date_of_birth)}</td>
                      <td className="px-4 py-3 text-slate-400">{m.id_number ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{m.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{m.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={m.is_active ? "text-emerald-400" : "text-slate-500"}>
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 space-x-3">
                        <Link
                          href={`/dashboard/family-members/${m.id}`}
                          className="text-xs font-medium text-sky-400 hover:text-sky-300"
                        >
                          Edit
                        </Link>
                        <form
                          action={toggleFamilyMemberActive.bind(null, m.id, !m.is_active)}
                          className="inline"
                        >
                          <button
                            type="submit"
                            className="text-xs font-medium text-slate-400 hover:text-slate-200"
                          >
                            {m.is_active ? "Deactivate" : "Activate"}
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
