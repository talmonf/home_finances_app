import { cookies } from "next/headers";
import {
  appBrandingStrings,
  loginHrefForPortal,
  parseAppPortalCookie,
  type AppPortal,
} from "@/lib/app-branding-strings";
import { APP_PORTAL_COOKIE } from "@/lib/app-portal-cookie";
import { householdUserOnlyPrivateClinicSection } from "@/lib/household-sections";
import type { UiLanguage } from "@/lib/ui-language";

export type { AppPortal } from "@/lib/app-branding-strings";
export { appBrandingStrings, loginHrefForPortal, parseAppPortalCookie };

export async function readAppPortalCookie(): Promise<AppPortal | null> {
  const store = await cookies();
  return parseAppPortalCookie(store.get(APP_PORTAL_COOKIE)?.value);
}

export async function resolveAppPortal(params: {
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  householdId: string | null | undefined;
  userId: string | null | undefined;
  uiLanguage: UiLanguage;
}): Promise<AppPortal> {
  if (
    params.isAuthenticated &&
    !params.isSuperAdmin &&
    params.householdId &&
    params.userId
  ) {
    const clinicOnly = await householdUserOnlyPrivateClinicSection(
      params.householdId,
      params.userId,
      params.uiLanguage,
    );
    if (clinicOnly) return "clinic";
    return "home";
  }

  const fromCookie = await readAppPortalCookie();
  return fromCookie ?? "home";
}
