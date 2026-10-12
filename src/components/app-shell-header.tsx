import Link from "next/link";
import {
  ClinicModuleUserGuideLink,
  ModuleBrandSwitcher,
} from "@/components/module-brand-switcher";
import { ObfuscateSessionToggle } from "@/components/obfuscate-session-toggle";
import { ProfileMenu } from "@/components/profile-menu";
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

export function AppShellHeader({
  uiLanguage,
  portal,
  householdMember,
  clinicEnabled,
  householdEnabled,
  obfuscate,
  signedInLabel,
  isSuperAdmin,
}: {
  uiLanguage: UiLanguage;
  portal: AppPortal;
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
  const showModuleSwitcher = householdMember && clinicEnabled && householdEnabled;
  const clinicOnly = householdMember && clinicEnabled && !householdEnabled;
  const showUserGuide = householdMember && clinicEnabled;

  const brand = showModuleSwitcher ? (
    <ModuleBrandSwitcher
      uiLanguage={uiLanguage}
      clinicEnabled={clinicEnabled}
      homeTitle={homeTitle}
      clinicTitle={clinicShortTitle}
    />
  ) : (
    <Link
      href={clinicOnly ? "/dashboard/private-clinic" : "/"}
      className={`${titleClass} whitespace-nowrap`}
    >
      {clinicOnly ? clinicProductTitle : h.appTitle}
    </Link>
  );

  const maskedName = maskSensitiveText(obfuscate, signedInLabel ?? "");

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {brand}
        {signedInLabel != null ? (
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-xs text-slate-300">
            <span className="hidden sm:inline">
              {h.signedInAs}{" "}
              <span className="font-medium text-slate-50">{maskedName}</span>
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
                  <ClinicModuleUserGuideLink
                    label={privateClinicNavLabel("gettingStarted", uiLanguage)}
                  />
                ) : null}
                <ObfuscateSessionToggle initialOn={obfuscate} isHebrew={uiLanguage === "he"} />
                <div className="hidden h-4 w-px bg-slate-700 sm:block" aria-hidden />
              </>
            ) : null}
            <ProfileMenu
              menuLabel={h.myProfile}
              signedInAs={h.signedInAs}
              signedInName={maskedName}
              changePasswordLabel={h.changePassword}
              signOutLabel={h.signOut}
              signOutConfirm={h.signOutConfirm}
              isSuperAdmin={isSuperAdmin}
              superAdminLabel={h.superAdmin}
            />
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
