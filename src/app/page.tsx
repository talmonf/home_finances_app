import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession, getCurrentUiLanguage, prisma } from "@/lib/auth";
import { getDashboardSections, type SetupCounts } from "@/lib/dashboard-sections";
import { getEffectiveEnabledSections } from "@/lib/household-sections";
import { countOpenMedicalReimbursementRequestsForHousehold } from "@/lib/medical-open-reimbursement-requests";
import {
  HouseholdDashboardPanel,
  type DashboardOngoingTileProps,
  type DashboardSetupTileProps,
} from "@/components/household-dashboard-panel";
import {
  getVisibleHomeFrequentLinks,
  homeFrequentLinksApplyToVisibleDashboard,
  homeFrequentLinksSectionTitle,
} from "@/lib/home-frequent-links";

function formatOpenReimbursementRequestsLabel(n: number, language: "en" | "he"): string {
  if (language === "he") {
    return n === 1 ? "בקשת החזר פתוחה אחת" : `${n} בקשות החזר פתוחות`;
  }
  return n === 1 ? "1 open reimbursement request" : `${n} open reimbursement requests`;
}

type HomeProps = {
  searchParams?: Promise<{ passwordUpdated?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const passwordJustUpdated = resolvedSearchParams?.passwordUpdated === "1";

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
  const uiLanguage = isSuperAdmin ? "en" : await getCurrentUiLanguage();
  const householdId = session.user.householdId ?? null;
  const userId = session.user.id;

  const householdFrequentLinksRow =
    !isSuperAdmin && householdId
      ? await prisma.households.findUnique({
          where: { id: householdId },
          select: { home_frequent_links_json: true },
        })
      : null;

  const setupCounts: SetupCounts | null = !isSuperAdmin && householdId
    ? await Promise.all([
        prisma.family_members.count({
          where: { household_id: householdId, is_active: true },
        }),
        prisma.properties.count({
          where: { household_id: householdId, is_active: true },
        }),
        prisma.cars.count({
          where: { household_id: householdId, is_active: true, sold_at: null },
        }),
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
      ? await getEffectiveEnabledSections({ householdId, userId })
      : [];

  const enabledBySectionId = new Map(
    enabledSections.map((s) => [s.sectionId, s.enabled] as const),
  );

  const medicalAppointmentsEnabled = enabledBySectionId.get("medicalAppointments") ?? true;

  const openMedicalReimbursementRequestCount =
    !isSuperAdmin && householdId && medicalAppointmentsEnabled
      ? await countOpenMedicalReimbursementRequestsForHousehold(householdId)
      : 0;

  const visibleSections = getDashboardSections(uiLanguage).filter(
    (s) => enabledBySectionId.get(s.id) ?? true,
  );

  if (
    !isSuperAdmin &&
    householdId &&
    visibleSections.length === 1 &&
    visibleSections[0].id === "privateClinic"
  ) {
    redirect(
      passwordJustUpdated ? "/dashboard/private-clinic?passwordUpdated=1" : "/dashboard/private-clinic",
    );
  }

  const allSetupSections = visibleSections.filter((s) => s.group === "setup");
  const setupSections = allSetupSections;
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

  const hasAnyTiles = setupSections.length > 0 || ongoingSections.length > 0;

  const frequentHomeLinks =
    !isSuperAdmin &&
    householdId &&
    homeFrequentLinksApplyToVisibleDashboard(visibleSections)
      ? getVisibleHomeFrequentLinks({
          rawJson: householdFrequentLinksRow?.home_frequent_links_json,
          enabledBySectionId,
          language: uiLanguage,
        })
      : [];

  const setupTiles: DashboardSetupTileProps[] =
    !isSuperAdmin && setupCounts
      ? setupSections.map((section) => ({
          id: section.id,
          title: section.title,
          description: section.description,
          href: section.href,
          count: section.countKey ? setupCounts[section.countKey] : null,
          countSuffix: section.countSuffix,
          isDone: isDoneBySectionId.get(section.id) ?? false,
        }))
      : [];

  const ongoingTiles: DashboardOngoingTileProps[] = !isSuperAdmin
    ? ongoingSections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        href: section.href,
        reimbursementNote:
          section.id === "medicalAppointments" && openMedicalReimbursementRequestCount > 0
            ? formatOpenReimbursementRequestsLabel(
                openMedicalReimbursementRequestCount,
                uiLanguage,
              )
            : null,
      }))
    : [];

  const welcomeSubtitleNonAdmin =
    uiLanguage === "he"
      ? "קיצורי דרך, משימות להשלמת ההקמה, וכלים שוטפים לניהול כספי משק הבית."
      : "Your shortcuts, setup checklist, and ongoing finance tools for this household.";

  const displayName = session.user.name ?? (uiLanguage === "he" ? "משתמש" : "user");
  const welcomeTitleNonAdmin =
    uiLanguage === "he" ? `ברוך שובך, ${displayName}` : `Welcome back, ${displayName}`;

  const passwordUpdatedBanner =
    passwordJustUpdated && uiLanguage === "he" ? (
      <p className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-200">
        הסיסמה עודכנה בהצלחה.
      </p>
    ) : passwordJustUpdated ? (
      <p className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-200">
        Your password was updated successfully.
      </p>
    ) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        {passwordUpdatedBanner}
        {isSuperAdmin ? (
          <>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-slate-50">
                  Welcome back, {session.user.name ?? "user"}
                </h1>
                <p className="text-sm text-slate-400">
                  Use the super admin tools to manage households and platform users.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Households (Super Admin)
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Create and manage all households on the platform.
                </p>
                <Link
                  href="/admin/households"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open household admin
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  System useful links
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Manage the platform-level useful links that appear across enabled sections.
                </p>
                <Link
                  href="/admin/useful-links"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open useful links
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Import audit log
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Review recent import runs, counts, and outcomes for troubleshooting.
                </p>
                <Link
                  href="/admin/import-audits"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open import audits
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  Clinic backup
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Create and restore full private-clinic snapshots for disaster recovery.
                </p>
                <Link
                  href="/admin/private-clinic-backups"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open backup console
                </Link>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-200">
                  General audit log
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Unified audit events for exports, imports, backups, and restores.
                </p>
                <Link
                  href="/admin/audits"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
                >
                  Open general audits
                </Link>
              </div>
            </div>
          </>
        ) : (
          <HouseholdDashboardPanel
            welcomeTitle={welcomeTitleNonAdmin}
            welcomeSubtitle={welcomeSubtitleNonAdmin}
            frequentLinksTitle={homeFrequentLinksSectionTitle(uiLanguage)}
            frequentLinks={frequentHomeLinks}
            hasAnyTiles={hasAnyTiles}
            setupTiles={setupTiles}
            ongoingTiles={ongoingTiles}
          />
        )}
      </div>
    </div>
  );
}
