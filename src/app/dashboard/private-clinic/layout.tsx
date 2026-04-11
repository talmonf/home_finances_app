import Link from "next/link";
import { getAuthSession, getCurrentUiLanguage, prisma } from "@/lib/auth";
import {
  privateClinicLayoutStrings,
  privateClinicNavLabel,
} from "@/lib/private-clinic-i18n";
import { householdUserOnlyPrivateClinicSection } from "@/lib/household-sections";
import { getVisiblePrivateClinicNavItems } from "@/lib/private-clinic-nav";
import {
  ensureDefaultConsultationTypes,
  ensureDefaultExpenseCategories,
  ensureTherapySettings,
} from "@/lib/therapy/bootstrap";
import { getPrivateClinicReminderBadgeCount } from "@/lib/private-clinic/reminder-badge";

export default async function PrivateClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  const uiLanguage = await getCurrentUiLanguage();
  const layoutCopy = privateClinicLayoutStrings(uiLanguage);
  const householdId = session?.user?.householdId;
  const userId = session?.user?.id;
  if (householdId && !session?.user?.isSuperAdmin) {
    await ensureTherapySettings(householdId);
    await ensureDefaultExpenseCategories(householdId);
    await ensureDefaultConsultationTypes(householdId);
  }

  let navItems = getVisiblePrivateClinicNavItems(null);
  if (householdId && !session?.user?.isSuperAdmin) {
    const settings = await prisma.therapy_settings.findUnique({
      where: { household_id: householdId },
      select: { nav_tabs_json: true },
    });
    navItems = getVisiblePrivateClinicNavItems(settings?.nav_tabs_json);
  }

  const onlyPrivateClinic =
    householdId &&
    userId &&
    !session?.user?.isSuperAdmin &&
    (await householdUserOnlyPrivateClinicSection(householdId, userId, uiLanguage));

  let reminderBadgeCount: number | null = null;
  if (
    householdId &&
    !session?.user?.isSuperAdmin &&
    navItems.some((i) => i.key === "reminders")
  ) {
    reminderBadgeCount = await getPrivateClinicReminderBadgeCount(prisma, householdId);
  }

  return (
    <div className="flex min-h-dvh justify-center bg-slate-950 px-3 py-6 sm:px-4 sm:py-10">
      <div className="w-full min-w-0 max-w-6xl space-y-4 sm:space-y-6">
        <header className="space-y-2 sm:space-y-3">
          {!onlyPrivateClinic ? (
            <Link
              href="/"
              className="inline-block text-sm text-slate-400 hover:text-slate-200"
            >
              {layoutCopy.backToDashboard}
            </Link>
          ) : null}
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
            {layoutCopy.title}
          </h1>
          <p className="text-sm text-slate-400">
            {layoutCopy.description}
          </p>
          <nav
            className="flex flex-wrap gap-2 border-b border-slate-800 pb-3"
            aria-label={layoutCopy.navAriaLabel}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-sm text-slate-200 ring-1 ring-slate-700 hover:bg-slate-800"
              >
                <span>{privateClinicNavLabel(item.key, uiLanguage)}</span>
                {item.key === "reminders" &&
                reminderBadgeCount != null &&
                reminderBadgeCount > 0 ? (
                  <span
                    className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600/90 px-1 text-[10px] font-semibold text-white tabular-nums"
                    aria-label={
                      uiLanguage === "he"
                        ? `${reminderBadgeCount} תזכורות קרובות`
                        : `${reminderBadgeCount} upcoming reminders`
                    }
                  >
                    {reminderBadgeCount > 99 ? "99+" : reminderBadgeCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
