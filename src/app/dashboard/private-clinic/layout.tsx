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
import PrivateClinicNavClient from "./private-clinic-nav-client";

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
      select: { nav_tabs_json: true, family_therapy_enabled: true },
    });
    navItems = getVisiblePrivateClinicNavItems(settings?.nav_tabs_json);
    if (!settings?.family_therapy_enabled) {
      navItems = navItems.filter((item) => item.key !== "families");
    }
  }

  const onlyPrivateClinic =
    householdId &&
    userId &&
    !session?.user?.isSuperAdmin &&
    (await householdUserOnlyPrivateClinicSection(householdId, userId, uiLanguage));

  let reminderBadgeCount: number | null = null;
  if (
    householdId &&
    userId &&
    !session?.user?.isSuperAdmin &&
    navItems.some((i) => i.key === "reminders")
  ) {
    const userRow = await prisma.users.findFirst({
      where: { id: userId, household_id: householdId, is_active: true },
      select: { family_member_id: true },
    });
    reminderBadgeCount = await getPrivateClinicReminderBadgeCount(
      prisma,
      householdId,
      userRow?.family_member_id ?? null,
    );
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
          <PrivateClinicNavClient
            navAriaLabel={layoutCopy.navAriaLabel}
            items={navItems.map((item) => ({
              key: item.key,
              href: item.href,
              label: privateClinicNavLabel(item.key, uiLanguage),
              reminderBadgeCount: item.key === "reminders" ? reminderBadgeCount : null,
              reminderBadgeAriaLabel:
                item.key === "reminders" && reminderBadgeCount != null
                  ? uiLanguage === "he"
                    ? `${reminderBadgeCount} תזכורות קרובות`
                    : `${reminderBadgeCount} upcoming reminders`
                  : undefined,
            }))}
          />
        </header>
        {children}
      </div>
    </div>
  );
}
