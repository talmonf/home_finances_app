import type { UiLanguage } from "@/lib/ui-language";

/**
 * Splash sign-in language from the browser.
 * Hebrew and English are honored; anything else, or a missing value, is Hebrew.
 */
export function uiLanguageFromBrowser(language: string | null | undefined): UiLanguage {
  const raw = (language ?? "").trim().toLowerCase();
  if (raw.startsWith("he")) return "he";
  if (raw.startsWith("en")) return "en";
  return "he";
}

export function clinicLoginHref(language: UiLanguage): string {
  return `/login?lang=${language}`;
}
