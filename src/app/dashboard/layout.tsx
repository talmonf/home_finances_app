import { Suspense } from "react";
import { headers } from "next/headers";
import { getAuthSession, getCurrentHouseholdDateDisplayFormat, getCurrentUiLanguage } from "@/lib/auth";
import { HouseholdPreferencesProvider } from "@/components/household-preferences-context";
import { UsefulLinksActionFlash } from "@/components/useful-links-action-flash";
import { UsefulLinksBanner } from "@/components/useful-links-banner";
import {
  htmlLangForDateDisplayFormat,
} from "@/lib/household-date-format";
import { sectionIdFromDashboardPathname } from "@/lib/useful-links/pathname-to-section";
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

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const usefulSectionId =
    session?.user?.householdId && !session.user.isSuperAdmin
      ? sectionIdFromDashboardPathname(pathname)
      : null;

  return (
    <HouseholdPreferencesProvider dateDisplayFormat={dateFormat} uiLanguage={uiLanguage}>
      <div lang={lang} dir={dir} className="contents">
        {session?.user?.householdId && !session.user.isSuperAdmin ? (
          <>
            {!usefulSectionId ? (
              <div className="flex justify-center bg-slate-950 px-4 pt-2">
                <div className="w-full max-w-6xl">
                  <Suspense fallback={null}>
                    <UsefulLinksActionFlash />
                  </Suspense>
                </div>
              </div>
            ) : null}
            {usefulSectionId ? (
              <div className="flex justify-center bg-slate-950 px-4 pt-4">
                <div className="w-full max-w-6xl space-y-2">
                  <Suspense fallback={null}>
                    <UsefulLinksActionFlash />
                  </Suspense>
                  <Suspense fallback={null}>
                    <UsefulLinksBanner sectionId={usefulSectionId} returnPath={pathname} />
                  </Suspense>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
        {children}
      </div>
    </HouseholdPreferencesProvider>
  );
}
