import Link from "next/link";
import { getAuthSession, prisma } from "@/lib/auth";
import { DASHBOARD_SECTIONS, type SetupCounts } from "@/lib/dashboard-sections";
import { getHouseholdEnabledSections } from "@/lib/household-sections";
import { toggleSetupSectionDone } from "@/lib/setup-section-actions";
import { SetupHouseholdCollapsible } from "@/components/setup-household-collapsible";

export default async function Home() {
  const session = await getAuthSession();

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="rounded-2xl bg-slate-900 px-10 py-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
          <h1 className="mb-3 text-2xl font-semibold text-slate-50">
            Home Finance Management
          </h1>
          <p className="mb-6 text-sm text-slate-400">
            Please sign in to access your households and finances.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  const isSuperAdmin = session.user.isSuperAdmin;
  const householdId = session.user.householdId ?? null;

  const setupCounts: SetupCounts | null = !isSuperAdmin && householdId
    ? await Promise.all([
        prisma.family_members.count({
          where: { household_id: householdId, is_active: true },
        }),
        prisma.properties.count({
          where: { household_id: householdId, is_active: true },
        }),
        prisma.cars.count({ where: { household_id: householdId, is_active: true } }),
        prisma.jobs.count({ where: { household_id: householdId, is_active: true } }),
        prisma.bank_accounts.count({
          where: { household_id: householdId, is_active: true },
        }),
        prisma.digital_payment_methods.count({
          where: { household_id: householdId, is_active: true },
        }),
        prisma.credit_cards.count({
          where: { household_id: householdId, is_active: true },
        }),
      ]).then(([
        familyMembers,
        properties,
        cars,
        jobs,
        bankAccounts,
        digitalPaymentMethods,
        creditCards,
      ]) => ({
        familyMembers,
        properties,
        cars,
        jobs,
        bankAccounts,
        digitalPaymentMethods,
        creditCards,
      }))
    : null;

  const enabledSections =
    !isSuperAdmin && householdId
      ? await getHouseholdEnabledSections(householdId)
      : [];

  const enabledBySectionId = new Map(
    enabledSections.map((s) => [s.sectionId, s.enabled] as const),
  );

  const visibleSections = DASHBOARD_SECTIONS.filter(
    (s) => enabledBySectionId.get(s.id) ?? true,
  );

  const setupSections = visibleSections.filter((s) => s.group === "setup");
  const ongoingSections = visibleSections.filter((s) => s.group === "ongoing");

  const setupSectionIds = setupSections.map((s) => s.id);

  const doneRows =
    !isSuperAdmin && householdId && setupSectionIds.length > 0
      ? await prisma.household_section_statuses.findMany({
          where: {
            household_id: householdId,
            section_id: { in: setupSectionIds },
          },
          select: { section_id: true, is_done: true },
        })
      : [];

  const isDoneBySectionId = new Map(
    doneRows.map((r) => [r.section_id, r.is_done] as const),
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">
              Welcome back, {session.user.name ?? "user"}
            </h1>
            <p className="text-sm text-slate-400">
              {isSuperAdmin
                ? "Use the super admin tools to manage households and platform users."
                : "This dashboard will show your households, accounts, and key finance insights."}
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              {isSuperAdmin ? "Households (Super Admin)" : "Households"}
            </h2>
            <p className="mb-3 text-xs text-slate-400">
              {isSuperAdmin
                ? "Create and manage all households on the platform."
                : "A households overview page will appear here once implemented."}
            </p>
            {isSuperAdmin && (
              <Link
                href="/admin/households"
                className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                Open household admin
              </Link>
            )}
          </div>
          {!isSuperAdmin && (
            <div className="col-span-full">
              {setupSections.length === 0 && ongoingSections.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Your super admin hasn&apos;t enabled any sections yet.
                </p>
              ) : (
                <>
                  {setupSections.length > 0 && (
                    <SetupHouseholdCollapsible>
                      {setupSections.map((section) => {
                        const count =
                          section.countKey && setupCounts
                            ? setupCounts[section.countKey]
                            : null;

                        const isDone =
                          isDoneBySectionId.get(section.id) ?? false;

                        return (
                          <div
                            key={section.id}
                            className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-slate-500"
                          >
                            <Link
                              href={section.href}
                              className="block focus:outline-none focus:ring-2 focus:ring-sky-400"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <h2 className="text-sm font-semibold text-slate-200">
                                  {section.title}
                                </h2>

                                <span
                                  className={`mt-0.5 rounded-full px-2 py-0.5 text-xs ${
                                    isDone
                                      ? "bg-emerald-500/15 text-emerald-300"
                                      : "bg-slate-500/15 text-slate-300"
                                  }`}
                                >
                                  {isDone ? "Done" : "Not done"}
                                </span>
                              </div>

                              {typeof count === "number" &&
                                section.countSuffix && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    {count} {section.countSuffix}
                                  </p>
                                )}

                              {section.description && (
                                <p className="mt-2 text-xs text-slate-400">
                                  {section.description}
                                </p>
                              )}
                            </Link>

                            {!isDone && (
                              <form
                                action={toggleSetupSectionDone}
                                className="mt-3"
                              >
                                <input
                                  type="hidden"
                                  name="section_id"
                                  value={section.id}
                                />
                                <input
                                  type="hidden"
                                  name="next_is_done"
                                  value="true"
                                />
                                <input type="hidden" name="redirect_to" value="/" />
                                <button
                                  type="submit"
                                  className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                                >
                                  Mark done
                                </button>
                              </form>
                            )}
                          </div>
                        );
                      })}
                    </SetupHouseholdCollapsible>
                  )}

                  {ongoingSections.length > 0 && (
                    <>
                      <div className="mt-6 mb-4 text-sm font-semibold text-slate-200">
                        Manage your finances
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        {ongoingSections.map((section) => (
                          <Link
                            key={section.id}
                            href={section.href}
                            className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                          >
                            <h2 className="mb-1 text-sm font-semibold text-slate-200">
                              {section.title}
                            </h2>
                            <p className="mt-2 text-xs text-slate-400">
                              {section.description}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
