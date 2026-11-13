import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/auth";
import { LOGIN_UI_LANGUAGE_COOKIE } from "@/lib/login-ui-language-cookie";
import { uiLanguageFromAcceptLanguage } from "@/lib/clinic-splash-language";
import { preferHebrewFromAcceptLanguage } from "@/lib/login-ui-language-helpers";
import { normalizeUiLanguage, type UiLanguage } from "@/lib/ui-language";

/** Pre-auth login shell default (cookie and per-user lookup still override). */
export const DEFAULT_LOGIN_UI_LANGUAGE: UiLanguage = "he";

export { LOGIN_UI_LANGUAGE_COOKIE, LOGIN_UI_LANGUAGE_COOKIE_OPTIONS } from "@/lib/login-ui-language-cookie";

export async function resolveLoginPageUiLanguage(): Promise<UiLanguage> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOGIN_UI_LANGUAGE_COOKIE)?.value;
  if (raw === "en" || raw === "he") {
    return raw;
  }

  const accept = (await headers()).get("accept-language");
  if (preferHebrewFromAcceptLanguage(accept)) {
    return "he";
  }

  return DEFAULT_LOGIN_UI_LANGUAGE;
}

/** Splash language: saved toggle, otherwise the browser's Hebrew or English preference. */
export async function resolveClinicSplashUiLanguage(): Promise<UiLanguage> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOGIN_UI_LANGUAGE_COOKIE)?.value;
  if (raw === "en" || raw === "he") {
    return raw;
  }

  const accept = (await headers()).get("accept-language");
  return uiLanguageFromAcceptLanguage(accept);
}

/** Logged-out shell language, including an explicit `/login?lang=` choice. */
export async function resolveLoggedOutUiLanguage(headerList: {
  get(name: string): string | null;
}): Promise<UiLanguage> {
  const loginLang = headerList.get("x-login-lang");
  if (loginLang === "en" || loginLang === "he") {
    return loginLang;
  }
  if (headerList.get("x-clinic-splash") === "1") {
    return resolveClinicSplashUiLanguage();
  }
  return resolveLoginPageUiLanguage();
}

/** Effective UI language for sign-in (user override, else household default). */
export async function lookupUiLanguageForLoginEmail(
  email: string,
): Promise<UiLanguage | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return null;
  }

  const user = await prisma.users.findUnique({
    where: { email: normalized },
    select: {
      ui_language: true,
      household: { select: { ui_language: true } },
    },
  });

  if (!user) {
    return null;
  }

  if (user.ui_language) {
    return normalizeUiLanguage(user.ui_language);
  }

  return normalizeUiLanguage(user.household?.ui_language);
}
