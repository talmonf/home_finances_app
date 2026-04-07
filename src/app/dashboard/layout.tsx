import { getAuthSession, getCurrentHouseholdDateDisplayFormat } from "@/lib/auth";
import { HouseholdPreferencesProvider } from "@/components/household-preferences-context";
import {
  htmlLangForDateDisplayFormat,
} from "@/lib/household-date-format";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  const dateFormat =
    session?.user?.householdId && !session.user.isSuperAdmin
      ? await getCurrentHouseholdDateDisplayFormat()
      : "YMD";
  const lang = htmlLangForDateDisplayFormat(dateFormat);

  return (
    <HouseholdPreferencesProvider dateDisplayFormat={dateFormat}>
      <div lang={lang} className="contents">
        {children}
      </div>
    </HouseholdPreferencesProvider>
  );
}
