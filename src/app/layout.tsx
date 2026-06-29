import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import {
  appBrandingStrings,
  loginHrefForPortal,
  resolveAppPortal,
} from "@/lib/app-branding";
import { getAuthSession, getCurrentHouseholdDateDisplayFormat, getCurrentUiLanguage } from "@/lib/auth";
import { resolveLoginPageUiLanguage } from "@/lib/login-ui-language";
import { htmlLangForDateDisplayFormat } from "@/lib/household-date-format";
import { appHeaderStrings, uiLanguageDirection } from "@/lib/ui-language";
import { SignOutButton } from "@/components/sign-out-button";
import { UiLanguageToggle } from "@/components/ui-language-toggle";

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
  const h = appHeaderStrings(uiLanguage, portal);

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
          <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 backdrop-blur">
            <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4">
              <Link href="/" className="font-semibold tracking-tight">
                {h.appTitle}
              </Link>
              {session?.user ? (
                <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-xs text-slate-300">
                  <span>
                    {h.signedInAs}{" "}
                    <span className="font-medium text-slate-50">
                      {session.user.name ?? session.user.email}
                    </span>
                    {session.user.isSuperAdmin && (
                      <span className="ms-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                        {h.superAdmin}
                      </span>
                    )}
                  </span>
                  {householdMember ? (
                    <>
                      <UiLanguageToggle uiLanguage={uiLanguage} />
                      <div className="h-4 w-px bg-slate-700" aria-hidden />
                    </>
                  ) : null}
                  <Link
                    href="/change-password"
                    className="rounded-lg border border-slate-600 px-3 py-1 font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                  >
                    {h.changePassword}
                  </Link>
                  <SignOutButton label={h.signOut} confirmMessage={h.signOutConfirm} />
                </div>
              ) : (
                <Link
                  href={loginHrefForPortal(portal)}
                  className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                >
                  {h.signIn}
                </Link>
              )}
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
