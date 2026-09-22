import Link from "next/link";
import { ObfuscateSessionToggle } from "@/components/obfuscate-session-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { UiLanguageToggle } from "@/components/ui-language-toggle";
import {
  appBrandingStrings,
  loginHrefForPortal,
  type AppPortal,
} from "@/lib/app-branding-strings";
import { privateClinicLayoutStrings, privateClinicNavLabel } from "@/lib/private-clinic-i18n";
import { maskSensitiveText } from "@/lib/privacy-display";
import { appHeaderStrings, type UiLanguage } from "@/lib/ui-language";

const titleClass = "font-semibold tracking-tight text-slate-50";
const quietTitleClass = "font-medium tracking-tight text-slate-400 hover:text-slate-200";

export function AppShellHeader({
  uiLanguage,
  portal,
  pathname,
  householdMember,
  clinicEnabled,
  householdEnabled,
  obfuscate,
  signedInLabel,
  isSuperAdmin,
}: {
  uiLanguage: UiLanguage;
  portal: AppPortal;
  pathname: string;
  householdMember: boolean;
  clinicEnabled: boolean;
  householdEnabled: boolean;
  obfuscate: boolean;
  signedInLabel: string | null;
  isSuperAdmin: boolean;
}) {
  const h = appHeaderStrings(uiLanguage, portal);
  const homeTitle = appBrandingStrings("home", uiLanguage).title;
  const clinicProductTitle = appBrandingStrings("clinic", uiLanguage).title;
  const clinicShortTitle = privateClinicLayoutStrings(uiLanguage).title;
  const clinicActive = pathname.startsWith("/dashboard/private-clinic");
  const showModuleSwitcher = householdMember && clinicEnabled && householdEnabled;
  const clinicOnly = householdMember && clinicEnabled && !householdEnabled;
  const showUserGuide = householdMember && clinicEnabled && clinicActive;

  const brand = showModuleSwitcher ? (
    <nav
      aria-label={uiLanguage === "he" ? "מודולים" : "Modules"}
      className="flex flex-wrap items-center gap-x-2 gap-y-1"
    >
      <Link
        href="/"
        aria-current={clinicActive ? undefined : "page"}
        className={clinicActive ? quietTitleClass : titleClass}
      >
        {homeTitle}
      </Link>
      <span className="text-slate-600" aria-hidden>
        |
      </span>
      <Link
        href="/dashboard/private-clinic"
        aria-current={clinicActive ? "page" : undefined}
        className={clinicActive ? titleClass : quietTitleClass}
      >
        {clinicShortTitle}
      </Link>
    </nav>
  ) : (
    <Link
      href={clinicOnly ? "/dashboard/private-clinic" : "/"}
      className={titleClass}
    >
      {clinicOnly ? clinicProductTitle : h.appTitle}
    </Link>
  );

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4">
        {brand}
        {signedInLabel != null ? (
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-xs text-slate-300">
            <span>
              {h.signedInAs}{" "}
              <span className="font-medium text-slate-50">
                {maskSensitiveText(obfuscate, signedInLabel)}
              </span>
              {isSuperAdmin ? (
                <span className="ms-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                  {h.superAdmin}
                </span>
              ) : null}
            </span>
            {householdMember ? (
              <>
                <UiLanguageToggle uiLanguage={uiLanguage} />
                {showUserGuide ? (
                  <Link
                    href="/dashboard/private-clinic/getting-started"
                    className="rounded-md px-2 py-1 font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  >
                    {privateClinicNavLabel("gettingStarted", uiLanguage)}
                  </Link>
                ) : null}
                <ObfuscateSessionToggle initialOn={obfuscate} isHebrew={uiLanguage === "he"} />
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
  );
}
