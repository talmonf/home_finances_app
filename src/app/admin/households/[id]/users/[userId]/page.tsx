import { PasswordInputWithToggle } from "@/components/PasswordInputWithToggle";
import { getAuthSession, prisma } from "@/lib/auth";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard-sections";
import { HOUSEHOLD_DATE_FORMAT_LABELS } from "@/lib/household-date-format";
import { getHouseholdEnabledSections, getUserEnabledSections } from "@/lib/household-sections";
import { UI_LANGUAGE_LABELS, UI_LANGUAGES } from "@/lib/ui-language";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    redirect("/");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!resolvedParams?.id || !resolvedParams?.userId) {
    notFound();
  }

  const householdId = resolvedParams.id;
  const userId = resolvedParams.userId;

  const [household, user, familyMembers] = await Promise.all([
    prisma.households.findUnique({ where: { id: householdId } }),
    prisma.users.findFirst({
      where: { id: userId, household_id: householdId },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
      select: { id: true, full_name: true },
    }),
  ]);

  if (!household || !user) {
    notFound();
  }

  const [userEnabledRows, householdEnabledRows] = await Promise.all([
    getUserEnabledSections({ householdId, userId }),
    getHouseholdEnabledSections(householdId),
  ]);
  const userEnabledBySectionId = new Map(
    userEnabledRows.map((row) => [row.sectionId, row.enabled] as const),
  );
  const householdEnabledBySectionId = new Map(
    householdEnabledRows.map((row) => [row.sectionId, row.enabled] as const),
  );

  function defaultSectionChecked(sectionId: string): boolean {
    if (userEnabledBySectionId.has(sectionId)) {
      return userEnabledBySectionId.get(sectionId)!;
    }
    return householdEnabledBySectionId.get(sectionId) ?? true;
  }

  const setupSections = DASHBOARD_SECTIONS.filter((s) => s.group === "setup");
  const ongoingSections = DASHBOARD_SECTIONS.filter((s) => s.group === "ongoing");
  const visibleHouseholdSections = DASHBOARD_SECTIONS.filter(
    (section) => householdEnabledBySectionId.get(section.id) ?? true,
  );
  const isClinicOnlyHousehold =
    visibleHouseholdSections.length === 1 &&
    visibleHouseholdSections[0]?.id === "privateClinic";
  const gmailFromLoginEmail = user.email.toLowerCase().endsWith("@gmail.com") ? user.email : "";
  const defaultGoogleGmailAddress = user.google_gmail_address ?? gmailFromLoginEmail;

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
            {!isClinicOnlyHousehold ? (
              <>
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
                <div>
                  <label
                    htmlFor="ui_language"
                    className="mb-1 block text-xs font-medium text-slate-300"
                  >
                    Interface language override
                  </label>
                  <select
                    id="ui_language"
                    name="ui_language"
                    defaultValue={user.ui_language ?? ""}
                    className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">Inherit household default ({UI_LANGUAGE_LABELS[(household.ui_language as "en" | "he") ?? "en"]})</option>
                    {UI_LANGUAGES.map((value) => (
                      <option key={value} value={value}>
                        {UI_LANGUAGE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}
            <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
              <input
                type="checkbox"
                id="show_useful_links"
                name="show_useful_links"
                defaultChecked={user.show_useful_links ?? false}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
              />
              <label htmlFor="show_useful_links" className="cursor-pointer text-sm text-slate-200">
                <span className="font-medium">Show useful links</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  When enabled, the user sees section quick links on dashboard pages. Super-admin only.
                </span>
              </label>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Google Calendar integration
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    id="google_calendar_enabled"
                    name="google_calendar_enabled"
                    defaultChecked={user.google_calendar_enabled ?? false}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                  />
                  Enable one-way Google Calendar sync for appointments
                </label>
                <div>
                  <label
                    htmlFor="google_gmail_address"
                    className="mb-1 block text-xs font-medium text-slate-300"
                  >
                    Gmail address
                  </label>
                  <input
                    id="google_gmail_address"
                    name="google_gmail_address"
                    type="email"
                    defaultValue={defaultGoogleGmailAddress}
                    placeholder="name@gmail.com"
                    className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
            <div>
              <label
                htmlFor="family_member_id"
                className="mb-1 block text-xs font-medium text-slate-300"
              >
                Linked family member (optional)
              </label>
              <select
                id="family_member_id"
                name="family_member_id"
                defaultValue={user.family_member_id ?? ""}
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">None</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name?.trim() || "(Unnamed)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="new_password"
                className="mb-1 block text-xs font-medium text-slate-300"
              >
                New password (optional)
              </label>
              <PasswordInputWithToggle
                id="new_password"
                name="new_password"
                autoComplete="new-password"
                placeholder="Leave blank to keep current password"
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                When set, must meet the password policy; the user will be asked to change it on next sign-in. Only super
                admins can change passwords here. Passwords are stored as a hash; nobody can view an existing user&apos;s
                password.
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
              <input
                type="checkbox"
                id="must_change_password"
                name="must_change_password"
                defaultChecked={user.must_change_password}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
              />
              <label htmlFor="must_change_password" className="cursor-pointer text-sm text-slate-200">
                <span className="font-medium">Require password change on next sign-in</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Applies when you are not setting a new password above. If you enter a new password, the user must change it
                  on next sign-in automatically.
                </span>
              </label>
            </div>

            {!isClinicOnlyHousehold ? (
              <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                <input type="hidden" name="user_section_overrides_present" value="1" />
                <h3 className="mb-2 text-sm font-semibold text-slate-200">
                  Enabled sections override
                </h3>
                <p className="mb-4 text-xs text-slate-500">
                  Checked values follow the household unless you change and save — then they become user-specific
                  overrides. A new user inherits the household until you save this form.
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
                            defaultChecked={defaultSectionChecked(section.id)}
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
                            defaultChecked={defaultSectionChecked(section.id)}
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
            ) : null}
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
