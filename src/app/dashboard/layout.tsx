import { getAuthSession, prisma } from "@/lib/auth";
import { HouseholdPreferencesProvider } from "@/components/household-preferences-context";
import {
  htmlLangForDateDisplayFormat,
  normalizeHouseholdDateDisplayFormat,
} from "@/lib/household-date-format";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  let dateFormat = normalizeHouseholdDateDisplayFormat(undefined);
  if (session?.user?.householdId && !session.user.isSuperAdmin) {
    const h = await prisma.households.findUnique({
      where: { id: session.user.householdId },
      select: { date_display_format: true },
    });
    dateFormat = normalizeHouseholdDateDisplayFormat(h?.date_display_format);
  }
  const lang = htmlLangForDateDisplayFormat(dateFormat);

  return (
    <HouseholdPreferencesProvider dateDisplayFormat={dateFormat}>
      <div lang={lang} className="contents">
        {children}
      </div>
    </HouseholdPreferencesProvider>
  );
}
