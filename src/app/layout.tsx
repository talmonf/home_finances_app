import type { Metadata } from "next";
import "./globals.css";
import { headers } from "next/headers";
import { AppShellHeader } from "@/components/app-shell-header";
import {
  appBrandingStrings,
  resolveAppPortal,
} from "@/lib/app-branding";
import {
  getAuthSession,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { getEffectiveModuleAccess } from "@/lib/household-sections";
import { resolveLoginPageUiLanguage } from "@/lib/login-ui-language";
import { htmlLangForDateDisplayFormat } from "@/lib/household-date-format";
import { uiLanguageDirection } from "@/lib/ui-language";

export async function generateMetadata(): Promise<Metadata> {
  const session = await getAuthSession();
  const householdMember =
    Boolean(session?.user?.householdId) && session?.user && !session.user.isSuperAdmin;
  const uiLanguage = householdMember
    ? await getCurrentUiLanguage()
    : await resolveLoginPageUiLanguage();
  const portal = await resolveAppPortal({
    isAuthenticated: Boolean(session?.user),
    isSuperAdmin: Boolean(session?.user?.isSuperAdmin),
    householdId: session?.user?.householdId,
    userId: session?.user?.id,
    uiLanguage,
  });
  const branding = appBrandingStrings(portal, uiLanguage);
  return {
    title: branding.title,
    description: branding.metadataDescription,
  };
}

// Ensure layout is rendered per request so it always sees the latest session
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAuthSession();
  const householdMember =
    Boolean(session?.user?.householdId) && session?.user && !session.user.isSuperAdmin;
  const uiLanguage = householdMember
    ? await getCurrentUiLanguage()
    : await resolveLoginPageUiLanguage();
  const dir = uiLanguageDirection(uiLanguage);
  const portal = await resolveAppPortal({
    isAuthenticated: Boolean(session?.user),
    isSuperAdmin: Boolean(session?.user?.isSuperAdmin),
    householdId: session?.user?.householdId,
    userId: session?.user?.id,
    uiLanguage,
  });
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const clinicSplash = headerList.get("x-clinic-splash") === "1";
  const moduleAccess =
    householdMember && session?.user?.householdId && session.user.id
      ? await getEffectiveModuleAccess(session.user.householdId, session.user.id, uiLanguage)
      : { clinicEnabled: false, householdEnabled: false };
  const obfuscate = householdMember ? await getCurrentObfuscateSensitive() : false;

  /** Native `<input type="date">` follows document `lang`; generic `en` maps to US (mm/dd) in Chromium. */
  let htmlLang: string = uiLanguage;
  if (householdMember) {
    if (uiLanguage === "he") {
      htmlLang = "he";
    } else {
      const dateFormat = await getCurrentHouseholdDateDisplayFormat();
      htmlLang = htmlLangForDateDisplayFormat(dateFormat);
    }
  }

  return (
    <html lang={htmlLang} dir={dir}>
      <body className="antialiased bg-slate-950 text-slate-50">
        <div className="min-h-screen">
          {clinicSplash ? null : (
            <AppShellHeader
              uiLanguage={uiLanguage}
              portal={portal}
              pathname={pathname}
              householdMember={Boolean(householdMember)}
              clinicEnabled={moduleAccess.clinicEnabled}
              householdEnabled={moduleAccess.householdEnabled}
              obfuscate={obfuscate}
              signedInLabel={
                session?.user ? (session.user.name ?? session.user.email ?? "") : null
              }
              isSuperAdmin={Boolean(session?.user?.isSuperAdmin)}
            />
          )}
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
