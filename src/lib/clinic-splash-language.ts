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

/**
 * Hebrew or English from an Accept-Language header.
 * The highest-quality Hebrew or English tag wins. Anything else is Hebrew.
 */
export function uiLanguageFromAcceptLanguage(acceptLanguage: string | null | undefined): UiLanguage {
  if (!acceptLanguage) return "he";
  let best: { lang: UiLanguage; q: number } | null = null;
  for (const part of acceptLanguage.split(",")) {
    const [tagRaw, ...params] = part.trim().split(";");
    const tag = (tagRaw ?? "").trim().toLowerCase();
    const lang: UiLanguage | null = tag.startsWith("he") ? "he" : tag.startsWith("en") ? "en" : null;
    if (!lang) continue;
    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key?.trim().toLowerCase() !== "q") continue;
      const parsed = Number(value);
      if (Number.isFinite(parsed)) q = parsed;
    }
    if (!best || q > best.q) best = { lang, q };
  }
  return best?.lang ?? "he";
}

export function clinicLoginHref(language: UiLanguage): string {
  return `/login?lang=${language}`;
}
