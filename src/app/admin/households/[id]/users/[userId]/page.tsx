import { prisma, requireSuperAdmin } from "@/lib/auth";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard-sections";
import { HOUSEHOLD_DATE_FORMAT_LABELS } from "@/lib/household-date-format";
import { getUserEnabledSections } from "@/lib/household-sections";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateHouseholdUser } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string; userId: string }>;
  searchParams?: Promise<{ updated?: string; error?: string }>;
};

function formatRole(role: string) {
  return role === "admin" ? "Admin" : "Member";
}

function formatUserType(t: string) {
  switch (t) {
    case "family_member":
      return "Family member";
    case "financial_advisor":
      return "Financial advisor";
    case "other":
      return "Other";
    default:
      return t;
  }
}

export default async function EditHouseholdUserPage({
  params,
  searchParams,
}: PageProps) {
  await requireSuperAdmin();

  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!resolvedParams?.id || !resolvedParams?.userId) {
    notFound();
  }

  const householdId = resolvedParams.id;
  const userId = resolvedParams.userId;

  const [household, user] = await Promise.all([
    prisma.households.findUnique({ where: { id: householdId } }),
    prisma.users.findFirst({
      where: { id: userId, household_id: householdId },
    }),
  ]);

  if (!household || !user) {
    notFound();
  }

  const userEnabledRows = await getUserEnabledSections({ householdId, userId });
  const userEnabledBySectionId = new Map(
    userEnabledRows.map((row) => [row.sectionId, row.enabled] as const),
  );
  const setupSections = DASHBOARD_SECTIONS.filter((s) => s.group === "setup");
  const ongoingSections = DASHBOARD_SECTIONS.filter((s) => s.group === "ongoing");

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-3xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <Link href="/admin/households" className="hover:text-slate-200">
              ← Households
            </Link>
            <span className="text-slate-600">·</span>
            <Link
              href={`/admin/households/${householdId}`}
              className="hover:text-slate-200"
            >
              Users
            </Link>
            <span className="text-slate-600">·</span>
            <Link
              href={`/admin/households/${householdId}/edit`}
              className="hover:text-slate-200"
            >
              Edit household
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">Edit user</h1>
            <p className="text-sm text-slate-400">
              {household.name} — {user.email}
            </p>
          </div>
          {(resolvedSearchParams?.updated || resolvedSearchParams?.error) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/60 text-emerald-100"
              }`}
            >
              {resolvedSearchParams.error
                ? decodeURIComponent(resolvedSearchParams.error)
                : "Changes saved."}
            </div>
          )}
        </header>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <p className="mb-4 text-xs text-slate-500">
            Current: {formatRole(user.role)} · {formatUserType(user.user_type)}
            {user.is_active ? (
              <span className="text-emerald-400/90"> · Active</span>
            ) : (
              <span className="text-slate-500"> · Inactive</span>
            )}
          </p>
          <form action={updateHouseholdUser} className="grid gap-4">
            <input type="hidden" name="household_id" value={household.id} />
            <input type="hidden" name="user_id" value={user.id} />
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-xs font-medium text-slate-300"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={user.email}
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label
                htmlFor="full_name"
                className="mb-1 block text-xs font-medium text-slate-300"
              >
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                required
                defaultValue={user.full_name}
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label
                htmlFor="role"
                className="mb-1 block text-xs font-medium text-slate-300"
              >
                Role
              </label>
              <select
                id="role"
                name="role"
                required
                defaultValue={user.role}
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="user_type"
                className="mb-1 block text-xs font-medium text-slate-300"
              >
                User type
              </label>
              <select
                id="user_type"
                name="user_type"
                required
                defaultValue={user.user_type}
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="family_member">Family member</option>
                <option value="financial_advisor">Financial advisor</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="date_display_format"
                className="mb-1 block text-xs font-medium text-slate-300"
              >
                Date display format override
              </label>
              <select
                id="date_display_format"
                name="date_display_format"
                defaultValue={user.date_display_format ?? ""}
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Inherit household default ({HOUSEHOLD_DATE_FORMAT_LABELS[household.date_display_format]})</option>
                {(["YMD", "DMY", "MDY"] as const).map((value) => (
                  <option key={value} value={value}>
                    {HOUSEHOLD_DATE_FORMAT_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-200">
                Enabled sections override
              </h3>
              <p className="mb-4 text-xs text-slate-500">
                These checkboxes are user-level overrides. Household defaults apply when no user override exists yet.
              </p>
              <div className="space-y-6">
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Setup
                  </h4>
                  <ul className="space-y-2">
                    {setupSections.map((section) => (
                      <li key={section.id} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                        <input
                          type="checkbox"
                          id={`section_${section.id}`}
                          name={`section_${section.id}`}
                          defaultChecked={userEnabledBySectionId.get(section.id) ?? true}
                          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                        />
                        <label htmlFor={`section_${section.id}`} className="flex-1 cursor-pointer text-sm text-slate-200">
                          <span className="font-medium">{section.title}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{section.description}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ongoing & tools
                  </h4>
                  <ul className="space-y-2">
                    {ongoingSections.map((section) => (
                      <li key={section.id} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                        <input
                          type="checkbox"
                          id={`section_${section.id}`}
                          name={`section_${section.id}`}
                          defaultChecked={userEnabledBySectionId.get(section.id) ?? true}
                          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                        />
                        <label htmlFor={`section_${section.id}`} className="flex-1 cursor-pointer text-sm text-slate-200">
                          <span className="font-medium">{section.title}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{section.description}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Link
                href={`/admin/households/${householdId}`}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Save
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
