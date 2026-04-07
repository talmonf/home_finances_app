import { getAuthSession, getCurrentHouseholdDateDisplayFormat, getCurrentUiLanguage } from "@/lib/auth";
import { HouseholdPreferencesProvider } from "@/components/household-preferences-context";
import {
  htmlLangForDateDisplayFormat,
} from "@/lib/household-date-format";
import { uiLanguageDirection } from "@/lib/ui-language";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  const dateFormat =
    session?.user?.householdId && !session.user.isSuperAdmin
      ? await getCurrentHouseholdDateDisplayFormat()
      : "YMD";
  const uiLanguage =
    session?.user?.householdId && !session.user.isSuperAdmin ? await getCurrentUiLanguage() : "en";
  const lang = uiLanguage === "he" ? "he" : htmlLangForDateDisplayFormat(dateFormat);
  const dir = uiLanguageDirection(uiLanguage);

  return (
    <HouseholdPreferencesProvider dateDisplayFormat={dateFormat} uiLanguage={uiLanguage}>
      <div lang={lang} dir={dir} className="contents">
        {children}
      </div>
    </HouseholdPreferencesProvider>
  );
}
