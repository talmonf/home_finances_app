import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/auth";
import { LOGIN_UI_LANGUAGE_COOKIE } from "@/lib/login-ui-language-cookie";
import { preferHebrewFromAcceptLanguage } from "@/lib/login-ui-language-helpers";
import {
  DEFAULT_UI_LANGUAGE,
  normalizeUiLanguage,
  type UiLanguage,
} from "@/lib/ui-language";

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

  return DEFAULT_UI_LANGUAGE;
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
