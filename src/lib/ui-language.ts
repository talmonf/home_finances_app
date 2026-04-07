export const UI_LANGUAGES = ["en", "he"] as const;

export type UiLanguage = (typeof UI_LANGUAGES)[number];

export const DEFAULT_UI_LANGUAGE: UiLanguage = "en";

export function normalizeUiLanguage(v: string | null | undefined): UiLanguage {
  return v === "he" ? "he" : "en";
}

export function uiLanguageDirection(v: UiLanguage): "ltr" | "rtl" {
  return v === "he" ? "rtl" : "ltr";
}

export const UI_LANGUAGE_LABELS: Record<UiLanguage, string> = {
  en: "English",
  he: "עברית",
};
